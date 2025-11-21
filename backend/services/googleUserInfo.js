const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export async function fetchGoogleUserProfile(accessToken) {
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

