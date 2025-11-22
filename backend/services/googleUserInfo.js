import { supabase } from '../supabaseClient.js';
import { getGoogleOAuthClient } from './googleOAuthClient.js';
import { fetchIdentityCredential, updateIdentityAccessToken } from './googleTokenStore.js';

const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

async function getStoredIdentityToken(userId) {
  if (!supabase) throw new Error('Supabase not configured');
  return await fetchIdentityCredential(userId);
}

export async function getFreshIdentityAccessToken(userId) {
  const token = await getStoredIdentityToken(userId);
  const isExpired = !token.expires_at || new Date(token.expires_at).getTime() < Date.now() - 60_000;
  if (!isExpired && token.access_token) {
    return token.access_token;
  }
  if (!token.refresh_token) {
    throw new Error('No refresh token available for identity credentials');
  }
  const client = getGoogleOAuthClient();
  const { credentials } = await client.refreshToken(token.refresh_token);
  await updateIdentityAccessToken(userId, credentials.access_token, credentials.expiry_date);
  return credentials.access_token;
}

export async function fetchGoogleUserProfile(accessToken, userId = null) {
  // If userId is provided, use refresh mechanism to get a fresh token
  if (userId) {
    try {
      accessToken = await getFreshIdentityAccessToken(userId);
    } catch (error) {
      // If refresh fails but we have an accessToken, try using it anyway
      if (!accessToken) {
        throw new Error(`Failed to get fresh access token: ${error.message}`);
      }
      console.warn('[fetchGoogleUserProfile] Token refresh failed, using provided token:', error.message);
    }
  }
  
  if (!accessToken) {
    throw new Error('Missing Google access token');
  }
  
  console.log('[fetchGoogleUserProfile] Fetching profile with access token:', {
    tokenLength: accessToken.length,
    tokenPrefix: accessToken.substring(0, 20) + '...'
  });
  
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    
    console.error('[fetchGoogleUserProfile] Failed to fetch profile:', {
      status: response.status,
      statusText: response.statusText,
      error: errorDetails
    });
    
    throw new Error(`Failed to fetch Google profile: ${response.status} ${JSON.stringify(errorDetails)}`);
  }
  
  const profile = await response.json();
  console.log('[fetchGoogleUserProfile] Successfully fetched profile:', {
    email: profile.email,
    sub: profile.sub,
    hasName: !!profile.name
  });
  
  return profile;
}

