import { OAuth2Client } from 'google-auth-library';
import { googleConfig, assertGoogleConfig, GOOGLE_CALENDAR_SCOPE } from '../config/googleConfig.js';

let oauthClient;

export function getGoogleOAuthClient() {
  if (!oauthClient) {
    assertGoogleConfig();
    oauthClient = new OAuth2Client(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
  }
  return oauthClient;
}

export function buildGoogleAuthUrl(scopes, stateParam) {
  const client = getGoogleOAuthClient();
  const scopeList = Array.isArray(scopes) && scopes.length > 0 ? scopes : undefined;
  
  // Ensure identity scopes are always included for profile access
  const identityScopes = ['openid', 'email', 'profile'];
  const allScopes = scopeList ? [...new Set([...identityScopes, ...scopeList])] : identityScopes;
  
  console.log('[buildGoogleAuthUrl] Building OAuth URL:', {
    requestedScopes: scopeList,
    allScopes,
    redirectUri: googleConfig.redirectUri,
    hasCalendarScope: allScopes.includes(GOOGLE_CALENDAR_SCOPE)
  });
  
  const url = client.generateAuthUrl({
    access_type: allScopes.includes(GOOGLE_CALENDAR_SCOPE) ? 'offline' : 'online',
    scope: allScopes,
    state: stateParam,
    include_granted_scopes: true,
    // Force both account selection and consent to ensure we get fresh tokens
    prompt: 'select_account consent',
  });
  
  console.log('[buildGoogleAuthUrl] Generated URL (first 100 chars):', url.substring(0, 100) + '...');
  
  return url;
}

export async function exchangeCodeForTokens(code) {
  if (!code) throw new Error('Missing authorization code');
  const client = getGoogleOAuthClient();
  try {
    console.log('[exchangeCodeForTokens] Exchanging code for tokens...', {
      codeLength: code.length,
      redirectUri: googleConfig.redirectUri,
      clientId: googleConfig.clientId ? `${googleConfig.clientId.substring(0, 20)}...` : 'missing'
    });
    
    const { tokens } = await client.getToken(code);
    
    console.log('[exchangeCodeForTokens] Token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!tokens.id_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      accessTokenLength: tokens.access_token?.length || 0
    });
    
    // Validate we got required tokens
    if (!tokens.access_token && !tokens.id_token) {
      throw new Error('Token exchange returned no access_token or id_token');
    }
    
    if (!tokens.id_token) {
      console.warn('[exchangeCodeForTokens] No id_token received - profile fetch may fail');
    }
    
    return tokens;
  } catch (error) {
    console.error('[exchangeCodeForTokens] Token exchange failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    throw new Error(`Failed to exchange authorization code: ${error.message}`);
  }
}

