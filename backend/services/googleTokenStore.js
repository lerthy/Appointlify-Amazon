import crypto from 'node:crypto';
import { supabase } from '../supabaseClient.js';

const IDENTITY_TABLE = 'google_identity_credentials';
const CALENDAR_TABLE = 'google_calendar_tokens';
const AUDIT_TABLE = 'google_consent_audit';

function requireDb() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
}

function normalizeScopes(scopes) {
  return Array.from(new Set((scopes || []).filter(Boolean))).sort();
}

export function computeScopeVersion(scopes) {
  const sorted = normalizeScopes(scopes);
  return crypto.createHash('sha256').update(sorted.join(' ')).digest('hex');
}

export async function upsertIdentityCredential({
  userId,
  googleSub,
  email,
  fullName,
  picture,
  idToken,
  accessToken,
  refreshToken,
  scopes,
  expiresAt,
}) {
  requireDb();
  const payload = {
    user_id: userId,
    google_sub: googleSub,
    email,
    full_name: fullName,
    picture,
    id_token: idToken,
    access_token: accessToken,
    refresh_token: refreshToken || null,
    scope: normalizeScopes(scopes),
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(IDENTITY_TABLE)
    .upsert(payload, { onConflict: 'google_sub' })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function upsertCalendarToken({
  userId,
  googleSub,
  refreshToken,
  accessToken,
  scopes,
  expiresAt,
  status = 'linked',
}) {
  requireDb();
  let resolvedRefreshToken = refreshToken;
  let existing = null;
  const { data: existingRow } = await supabase
    .from(CALENDAR_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingRow) {
    existing = existingRow;
    if (!resolvedRefreshToken && existing.refresh_token) {
      resolvedRefreshToken = existing.refresh_token;
    }
  }

  if (!resolvedRefreshToken) {
    throw new Error('Missing Google refresh token for calendar access');
  }

  const payload = {
    ...(existing?.id ? { id: existing.id } : {}),
    user_id: userId,
    google_sub: googleSub,
    refresh_token: resolvedRefreshToken,
    access_token: accessToken,
    scope: normalizeScopes(scopes),
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    status,
    failure_count: 0,
    last_health_check: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(CALENDAR_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function markCalendarUnlinked(userId) {
  requireDb();
  const { error } = await supabase
    .from(CALENDAR_TABLE)
    .update({
      status: 'disconnected',
      failure_count: 0,
      refresh_token: null,
      access_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

export async function updateCalendarFailureCount(userId, failureCount, status = 'linked') {
  requireDb();
  const { error } = await supabase
    .from(CALENDAR_TABLE)
    .update({
      failure_count: failureCount,
      status,
      last_health_check: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function logConsentEvent({ userId, googleSub, eventType, scopes, metadata }) {
  requireDb();
  const payload = {
    user_id: userId || null,
    google_sub: googleSub || null,
    event_type: eventType,
    scopes: normalizeScopes(scopes),
    metadata: metadata || null,
  };
  const { error } = await supabase.from(AUDIT_TABLE).insert(payload);
  if (error) throw error;
}

export async function fetchCalendarStatus(userId) {
  requireDb();
  const { data, error } = await supabase
    .from(CALENDAR_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUsersNeedingScopeUpgrade(requiredVersion) {
  requireDb();
  const { data, error } = await supabase
    .from('users')
    .select('id, calendar_scope_version')
    .neq('calendar_scope_version', requiredVersion)
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function setCalendarLinkedFlag(userId, linked, scopeVersion) {
  requireDb();
  const updatePayload = {
    calendar_linked: linked,
    calendar_last_prompted: new Date().toISOString(),
  };
  if (scopeVersion !== undefined) {
    updatePayload.calendar_scope_version = scopeVersion;
  }
  const { error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId);
  if (error) throw error;
}

export async function listActiveCalendarTokens(limit = 25) {
  requireDb();
  const { data, error } = await supabase
    .from(CALENDAR_TABLE)
    .select('user_id, refresh_token, failure_count')
    .eq('status', 'linked')
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function updateCalendarAccessToken(userId, accessToken, expiresAt) {
  requireDb();
  const { error } = await supabase
    .from(CALENDAR_TABLE)
    .update({
      access_token: accessToken,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      failure_count: 0,
      last_health_check: new Date().toISOString(),
      status: 'linked',
    })
    .eq('user_id', userId);
  if (error) throw error;
}

