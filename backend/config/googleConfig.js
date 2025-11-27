import assert from 'node:assert';

const identityScopes = ['openid', 'email', 'profile'];
const calendarScope = 'https://www.googleapis.com/auth/calendar.events';

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
// Handle comma-separated redirect URIs - use first one (or detect environment)
const redirectUriRaw = process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
const redirectUriList = redirectUriRaw.split(',').map(uri => uri.trim()).filter(Boolean);
// Use first redirect URI (or detect based on NODE_ENV if needed)
const redirectUri = redirectUriList[0] || '';
const allowedOrigins = (process.env.GOOGLE_OAUTH_ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

export const googleConfig = {
  clientId,
  clientSecret,
  redirectUri,
  allowedOrigins,
  healthIntervalMs: Number(process.env.GOOGLE_CALENDAR_HEALTH_INTERVAL_MS || 15 * 60 * 1000),
};

export const GOOGLE_IDENTITY_SCOPES = identityScopes;
export const GOOGLE_CALENDAR_SCOPE = calendarScope;

export function assertGoogleConfig(requireCalendar = false) {
  assert(clientId, 'GOOGLE_OAUTH_CLIENT_ID is required');
  assert(clientSecret, 'GOOGLE_OAUTH_CLIENT_SECRET is required');
  assert(redirectUri, 'GOOGLE_OAUTH_REDIRECT_URI is required');
  if (requireCalendar) {
    assert(calendarScope, 'GOOGLE_CALENDAR_SCOPE missing');
  }
}

export function resolveScopeSet(requestedScope = 'both') {
  const normalized = (requestedScope || 'both').toLowerCase();
  if (normalized === 'identity') return [...identityScopes];
  if (normalized === 'calendar') return [calendarScope];
  return [...new Set([...identityScopes, calendarScope])];
}

