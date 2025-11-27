import { supabase } from '../supabaseClient.js';
import { getGoogleOAuthClient } from './googleOAuthClient.js';
import { updateCalendarAccessToken } from './googleTokenStore.js';

const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';

async function getStoredCalendarToken(userId) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('refresh_token, access_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Google Calendar not linked');
  return data;
}

export async function getFreshCalendarAccessToken(userId) {
  const token = await getStoredCalendarToken(userId);
  const isExpired = !token.expires_at || new Date(token.expires_at).getTime() < Date.now() - 60_000;
  if (!isExpired && token.access_token) {
    return token.access_token;
  }
  const client = getGoogleOAuthClient();
  const { credentials } = await client.refreshToken(token.refresh_token);
  await updateCalendarAccessToken(userId, credentials.access_token, credentials.expiry_date);
  return credentials.access_token;
}

export async function callGoogleCalendar(userId, path, init = {}) {
  const accessToken = await getFreshCalendarAccessToken(userId);
  
  if (!accessToken) {
    throw new Error('No valid access token available for Google Calendar');
  }
  
  const response = await fetch(`${CALENDAR_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `Google Calendar error: ${response.status}`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error?.message || errorData.error_description || errorMessage;
    } catch {
      errorMessage = `${errorMessage} ${text}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

