import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  googleConfig,
  assertGoogleConfig,
  resolveScopeSet,
  GOOGLE_CALENDAR_SCOPE,
} from '../config/googleConfig.js';
import { buildGoogleAuthUrl, exchangeCodeForTokens } from '../services/googleOAuthClient.js';
import { createOAuthSession, consumeOAuthSession } from '../services/oauthSessionStore.js';
import { fetchGoogleUserProfile } from '../services/googleUserInfo.js';
import {
  upsertIdentityCredential,
  upsertCalendarToken,
  logConsentEvent,
  setCalendarLinkedFlag,
  fetchCalendarStatus,
  computeScopeVersion,
  markCalendarUnlinked,
} from '../services/googleTokenStore.js';
import { attachSupabaseUser, requireSupabaseUser, requireSupabaseIdentity } from '../middleware/supabaseUser.js';
import { getOrCreateUserProfile, updateSignupMethod, getOrCreateSupabaseAuthUser } from '../services/userProfileService.js';

const router = express.Router();

// Health check for Google routes
router.get('/integrations/google/health', (req, res) => {
  res.json({ success: true, message: 'Google integration routes are active' });
});

const launcherLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

function sendPopupResponse(res, payload, fallbackUrl) {
  const script = `
    <script>
      (function() {
        const payload = ${JSON.stringify(payload)};
        console.log('[OAuth Callback] Attempting to post message:', payload);
        let posted = false;
        if (window.opener && typeof window.opener.postMessage === 'function') {
          // Try posting to any origin first (most permissive)
          try {
            window.opener.postMessage(payload, '*');
            console.log('[OAuth Callback] Posted message to *');
            posted = true;
          } catch (err) {
            console.warn('[OAuth Callback] postMessage to * failed', err);
          }
          
          // Also try posting to specific allowed origins as fallback
          const origins = ${JSON.stringify(googleConfig.allowedOrigins.length ? googleConfig.allowedOrigins : [])};
          console.log('[OAuth Callback] Trying allowed origins:', origins);
          origins.forEach(origin => {
            if (!posted) {
              try {
                window.opener.postMessage(payload, origin);
                console.log('[OAuth Callback] Posted message to', origin);
                posted = true;
              } catch (err) {
                console.warn('[OAuth Callback] postMessage to ' + origin + ' failed', err);
              }
            }
          });
        } else {
          console.error('[OAuth Callback] No window.opener or postMessage not available');
        }
        if (posted) {
          console.log('[OAuth Callback] Message posted successfully, closing window');
          setTimeout(() => window.close(), 100);
        } else if (${JSON.stringify(Boolean(fallbackUrl))}) {
          console.log('[OAuth Callback] Message not posted, redirecting to:', ${JSON.stringify(fallbackUrl || '/')});
          window.location.replace(${JSON.stringify(fallbackUrl || '/')});
        } else {
          console.log('[OAuth Callback] Message not posted, showing payload');
          document.body.innerHTML = '<pre>' + JSON.stringify(payload, null, 2) + '</pre>';
        }
      })();
    </script>
  `;
  res.type('html').send(script);
}

router.get('/auth/google', launcherLimiter, attachSupabaseUser, async (req, res) => {
  try {
    // Check Google OAuth configuration
    try {
      assertGoogleConfig();
    } catch (configError) {
      console.error('[GET /auth/google] Configuration error:', configError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Google OAuth not configured',
        details: configError.message,
        hint: 'Please set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI in your environment variables'
      });
    }

    // Validate redirect URI matches what's in Google Cloud Console
    console.log('[GET /auth/google] Using redirect URI:', googleConfig.redirectUri);
    console.log('[GET /auth/google] Allowed origins:', googleConfig.allowedOrigins);

    const scopeParam = (req.query.scope || 'calendar').toString();
    const scopeSet = resolveScopeSet(scopeParam);

    if (scopeParam !== 'identity' && !req.appUser) {
      return res.status(401).json({ success: false, error: 'Authentication required for calendar scopes' });
    }

    const state = createOAuthSession({
      scope: scopeParam,
      scopes: scopeSet,
      userId: req.appUser?.id || null,
      authUserId: req.supabaseUser?.id || null,
      returnUrl: typeof req.query.returnUrl === 'string' ? req.query.returnUrl : null,
      mode: req.query.mode || scopeParam,
    });

    const url = buildGoogleAuthUrl(scopeSet, state);
    console.log('[GET /auth/google] Generated OAuth URL with redirect URI:', googleConfig.redirectUri);
    res.json({ success: true, url, state });
  } catch (error) {
    console.error('[GET /auth/google] error', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/auth/google/callback', async (req, res) => {
  const { state, code, error, error_description } = req.query;
  const session = consumeOAuthSession(state);

  console.log('[auth/google/callback] Received callback:', { 
    hasState: !!state, 
    hasCode: !!code, 
    hasError: !!error,
    hasSession: !!session,
    userId: session?.userId 
  });

  if (!session) {
    console.error('[auth/google/callback] No session found for state:', state);
    return sendPopupResponse(res, { success: false, error: 'Invalid or expired OAuth session' });
  }

  if (error) {
    console.error('[auth/google/callback] OAuth error:', error, error_description);
    await logConsentEvent({
      userId: session.userId,
      googleSub: null,
      eventType: 'oauth_error',
      scopes: session.scopes,
      metadata: { error, error_description },
    });
    return sendPopupResponse(res, { success: false, error: error_description || error }, session.returnUrl);
  }

  if (!code) {
    console.error('[auth/google/callback] No authorization code received');
    
    // If no code but we have a userId, check if calendar is already linked
    if (session.userId) {
      try {
        const existingStatus = await fetchCalendarStatus(session.userId);
        if (existingStatus && existingStatus.status === 'linked' && existingStatus.refresh_token) {
          console.log('[auth/google/callback] No code but calendar already linked, returning success');
          return sendPopupResponse(res, {
            success: true,
            scope: session.scope,
            calendarLinked: true,
            message: 'Calendar is already connected',
          }, session.returnUrl);
        }
      } catch (statusErr) {
        console.error('[auth/google/callback] Error checking existing status:', statusErr);
      }
    }
    
    return sendPopupResponse(res, { 
      success: false, 
      error: 'No authorization code received. If you already granted permissions, try disconnecting and reconnecting.' 
    }, session.returnUrl);
  }

  try {
    console.log('[auth/google/callback] Exchanging code for tokens...', {
      codeLength: code.length,
      redirectUri: googleConfig.redirectUri,
      requestedScopes: session.scopes
    });
    
    const tokens = await exchangeCodeForTokens(code);
    
    // Validate token exchange was successful
    if (!tokens.access_token && !tokens.id_token) {
      console.error('[auth/google/callback] Token exchange returned no usable tokens');
      return sendPopupResponse(res, {
        success: false,
        error: 'Token exchange failed: No access token or ID token received. Please check your OAuth configuration.'
      }, session.returnUrl);
    }
    
    console.log('[auth/google/callback] Token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!tokens.id_token,
      scopes: tokens.scope,
      tokenType: tokens.token_type
    });
    
    // Get granted scopes - use what Google returned, fallback to requested
    const scopes = tokens.scope ? tokens.scope.split(' ').filter(Boolean) : session.scopes;
    console.log('[auth/google/callback] Granted scopes:', scopes);
    
    // Verify we have identity scopes (required for profile)
    const hasIdentityScopes = scopes.some(s => 
      s === 'openid' || s === 'email' || s === 'profile' || 
      s.includes('openid') || s.includes('email') || s.includes('profile')
    );
    
    if (!hasIdentityScopes && !tokens.id_token) {
      console.warn('[auth/google/callback] No identity scopes granted and no id_token - profile fetch may fail');
    }
    
    // Try to fetch profile, but if it fails with 401, use id_token instead
    let profile;
    try {
      profile = await fetchGoogleUserProfile(tokens.access_token);
      console.log('[auth/google/callback] Successfully fetched profile with access token');
    } catch (profileErr) {
      console.error('[auth/google/callback] Failed to fetch profile with access token:', profileErr.message);
      console.log('[auth/google/callback] Attempting to get profile from id_token...');
      
      // If access token fails, use the id_token to get user info (this is more reliable)
      if (tokens.id_token) {
        try {
          // Decode id_token to get user info (it's a JWT)
          const { getGoogleOAuthClient } = await import('../services/googleOAuthClient.js');
          const client = getGoogleOAuthClient();
          const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: googleConfig.clientId,
          });
          const payload = ticket.getPayload();
          profile = {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          };
          console.log('[auth/google/callback] Successfully got profile from id_token:', {
            email: profile.email,
            sub: profile.sub
          });
        } catch (idTokenErr) {
          console.error('[auth/google/callback] Failed to get profile from id_token:', idTokenErr);
          // If both fail, we can't proceed - return error
          return sendPopupResponse(res, {
            success: false,
            error: `Failed to authenticate with Google: ${idTokenErr.message || profileErr.message}. Please try again.`
          }, session.returnUrl);
        }
      } else {
        console.error('[auth/google/callback] No id_token available, cannot proceed');
        return sendPopupResponse(res, {
          success: false,
          error: `Failed to fetch user profile: ${profileErr.message}. No id_token available.`
        }, session.returnUrl);
      }
    }
    
    if (!profile || !profile.email) {
      console.error('[auth/google/callback] Profile is missing required fields:', profile);
      return sendPopupResponse(res, {
        success: false,
        error: 'Failed to get user information from Google. Please try again.'
      }, session.returnUrl);
    }

    // Create or get Supabase auth user from Google id_token
    let supabaseAuthUser;
    try {
      supabaseAuthUser = await getOrCreateSupabaseAuthUser(
        tokens.id_token,
        profile.email,
        profile.name,
        profile.picture
      );
    } catch (authErr) {
      console.error('[auth/google/callback] Failed to create Supabase auth user:', authErr);
      return sendPopupResponse(res, { 
        success: false, 
        error: `Authentication failed: ${authErr.message}` 
      }, session.returnUrl);
    }

    // Get or create user profile in our users table
    let appUser;
    try {
      appUser = await getOrCreateUserProfile(supabaseAuthUser, { 
        signupMethod: 'google',
        name: profile.name,
      });
      console.log('[auth/google/callback] User profile:', {
        appUserId: appUser.id,
        sessionUserId: session.userId,
        email: appUser.email,
        match: appUser.id === session.userId
      });
      
      // If session has a userId but it doesn't match the appUser, log a warning
      if (session.userId && appUser.id !== session.userId) {
        console.warn('[auth/google/callback] User ID mismatch:', {
          sessionUserId: session.userId,
          appUserId: appUser.id,
          message: 'OAuth session user ID does not match created/found user profile'
        });
        // Use the session userId if provided, otherwise use appUser.id
        // This ensures we store tokens for the correct user
      }
    } catch (profileErr) {
      console.error('[auth/google/callback] Failed to create user profile:', profileErr);
      return sendPopupResponse(res, { 
        success: false, 
        error: `Profile creation failed: ${profileErr.message}` 
      }, session.returnUrl);
    }
    
    // Use session.userId if available (from Settings page), otherwise use appUser.id
    // This ensures we're storing tokens for the user who initiated the OAuth flow
    const targetUserId = session.userId || appUser.id;
    console.log('[auth/google/callback] Using target user ID for token storage:', targetUserId);

    // Store Google identity credentials
    await upsertIdentityCredential({
      userId: targetUserId,
      googleSub: profile.sub,
      email: profile.email,
      fullName: profile.name,
      picture: profile.picture,
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scopes,
      expiresAt: tokens.expiry_date,
    });

    // Store calendar token ONLY if calendar scope was actually granted
    let calendarLinked = false;
    const hasCalendarScope = scopes.includes(GOOGLE_CALENDAR_SCOPE);
    
    console.log('[auth/google/callback] Checking calendar scope:', {
      requestedScopes: session.scopes,
      grantedScopes: scopes,
      hasCalendarScope,
      hasRefreshToken: !!tokens.refresh_token,
      hasAccessToken: !!tokens.access_token,
      targetUserId
    });
    
    if (hasCalendarScope) {
      // Verify we have a refresh token (required for offline access)
      if (!tokens.refresh_token) {
        console.error('[auth/google/callback] Calendar scope granted but no refresh token received');
        await logConsentEvent({
          userId: targetUserId,
          googleSub: profile.sub,
          eventType: 'calendar_error',
          scopes,
          metadata: { error: 'No refresh token received - access_type must be offline' },
        });
      } else {
        try {
          const scopeVersion = computeScopeVersion(scopes);
          console.log('[auth/google/callback] Storing calendar token for user:', targetUserId);
          await upsertCalendarToken({
            userId: targetUserId,
            googleSub: profile.sub,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
            scopes,
            expiresAt: tokens.expiry_date,
          });
          await setCalendarLinkedFlag(targetUserId, true, scopeVersion);
          calendarLinked = true;
          console.log('[auth/google/callback] Calendar token stored successfully for user:', targetUserId);
          await logConsentEvent({
            userId: targetUserId,
            googleSub: profile.sub,
            eventType: 'calendar_granted',
            scopes,
            metadata: { mode: session.mode },
          });
        } catch (calendarErr) {
          console.error('[auth/google/callback] Calendar token store error:', calendarErr);
          console.error('[auth/google/callback] Error details:', {
            message: calendarErr.message,
            stack: calendarErr.stack,
            userId: targetUserId
          });
          await logConsentEvent({
            userId: targetUserId,
            googleSub: profile.sub,
            eventType: 'calendar_error',
            scopes,
            metadata: { error: calendarErr.message },
          });
        }
      }
    } else {
      console.log('[auth/google/callback] Calendar scope not granted. Scopes received:', scopes);
      // Log that calendar was not granted
      await logConsentEvent({
        userId: targetUserId,
        googleSub: profile.sub,
        eventType: 'calendar_denied',
        scopes,
        metadata: { mode: session.mode },
      });
    }

    const responsePayload = {
      success: true,
      scope: session.scope,
      calendarLinked,
      supabaseUserId: supabaseAuthUser.id,
      email: profile.email,
      userId: targetUserId, // Include user ID for frontend to verify
    };

    console.log('[auth/google/callback] Sending success response:', { 
      success: responsePayload.success, 
      calendarLinked: responsePayload.calendarLinked,
      userId: responsePayload.userId 
    });

    sendPopupResponse(res, responsePayload, session.returnUrl);
  } catch (err) {
    console.error('[auth/google/callback] error', err);
    sendPopupResponse(res, { success: false, error: err.message }, session.returnUrl);
  }
});

router.post('/auth/google/session', requireSupabaseIdentity, async (req, res) => {
  try {
    let profile = req.appUser;
    let created = false;

    if (!profile) {
      profile = await getOrCreateUserProfile(req.supabaseUser, { signupMethod: 'google' });
      created = true;
      await logConsentEvent({
        userId: profile.id,
        googleSub: null,
        eventType: 'account_created_google',
        scopes: [],
        metadata: { email: profile.email },
      });
    } else if (profile.signup_method !== 'google') {
      await updateSignupMethod(profile.id, 'google');
      await logConsentEvent({
        userId: profile.id,
        googleSub: null,
        eventType: 'google_linked_post_signup',
        scopes: [],
        metadata: { previous_signup_method: profile.signup_method },
      });
      profile = { ...profile, signup_method: 'google' };
    }

    res.json({ success: true, user: profile, created });
  } catch (error) {
    console.error('[POST /auth/google/session]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/integrations/google/status', requireSupabaseUser, async (req, res) => {
  try {
    if (!req.appUser) {
      return res.status(401).json({ success: false, error: 'User profile not found' });
    }
    
    console.log('[GET /integrations/google/status] Checking status for user:', req.appUser.id);
    const status = await fetchCalendarStatus(req.appUser.id);
    console.log('[GET /integrations/google/status] Calendar status from DB:', status);
    
    const requiredVersion = computeScopeVersion(resolveScopeSet('both'));
    const needsMigration = Boolean(
      req.appUser.calendar_scope_version &&
      req.appUser.calendar_scope_version !== requiredVersion
    );
    
    const linked = Boolean(status?.status === 'linked' && status?.refresh_token);
    
    console.log('[GET /integrations/google/status] Response:', {
      hasStatus: !!status,
      statusValue: status?.status,
      hasRefreshToken: !!status?.refresh_token,
      linked,
      needsMigration,
      userCalendarLinked: req.appUser.calendar_linked
    });
    
    res.json({
      success: true,
      status: status || null,
      needsMigration,
      linked,
    });
  } catch (error) {
    console.error('[GET /integrations/google/status] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integrations/google/disconnect', requireSupabaseUser, async (req, res) => {
  try {
    await markCalendarUnlinked(req.appUser.id);
    await setCalendarLinkedFlag(req.appUser.id, false, null);
    await logConsentEvent({
      userId: req.appUser.id,
      googleSub: null,
      eventType: 'calendar_revoked',
      scopes: [],
      metadata: null,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/integrations/google/scope-migration', requireSupabaseUser, async (req, res) => {
  try {
    const requiredVersion = computeScopeVersion([GOOGLE_CALENDAR_SCOPE]);
    const needs = req.appUser.calendar_scope_version !== requiredVersion;
    res.json({ success: true, needsMigration: needs, requiredVersion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Diagnostic endpoint to check calendar tokens in database
router.get('/integrations/google/debug', requireSupabaseUser, async (req, res) => {
  try {
    if (!req.appUser) {
      return res.status(401).json({ success: false, error: 'User profile not found' });
    }
    
    const { supabase } = await import('../supabaseClient.js');
    
    // Check calendar tokens table
    const { data: calendarTokens, error: tokensError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', req.appUser.id);
    
    // Check identity credentials
    const { data: identityCreds, error: identityError } = await supabase
      .from('google_identity_credentials')
      .select('*')
      .eq('user_id', req.appUser.id);
    
    // Check user table flags
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, calendar_linked, calendar_scope_version')
      .eq('id', req.appUser.id)
      .single();
    
    res.json({
      success: true,
      userId: req.appUser.id,
      userEmail: req.appUser.email,
      calendarTokens: calendarTokens || [],
      identityCredentials: identityCreds || [],
      userFlags: userData || null,
      errors: {
        tokens: tokensError?.message,
        identity: identityError?.message,
        user: userError?.message,
      }
    });
  } catch (error) {
    console.error('[GET /integrations/google/debug] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

