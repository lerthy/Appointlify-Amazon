import { getGoogleOAuthClient } from './googleOAuthClient.js';
import {
  listActiveCalendarTokens,
  updateCalendarAccessToken,
  updateCalendarFailureCount,
  setCalendarLinkedFlag,
  logConsentEvent,
} from './googleTokenStore.js';
import { googleConfig } from '../config/googleConfig.js';

const HEALTH_BATCH_SIZE = 10;
let monitorTimer = null;

async function refreshTokenForUser(record) {
  const client = getGoogleOAuthClient();
  const { credentials } = await client.refreshToken(record.refresh_token);
  await updateCalendarAccessToken(record.user_id, credentials.access_token, credentials.expiry_date);
}

async function handleRefreshFailure(record) {
  const nextFailureCount = (record.failure_count || 0) + 1;
  const status = nextFailureCount >= 2 ? 'disconnected' : 'linked';
  await updateCalendarFailureCount(record.user_id, nextFailureCount, status);
  if (nextFailureCount >= 2) {
    await setCalendarLinkedFlag(record.user_id, false, null);
    await logConsentEvent({
      userId: record.user_id,
      googleSub: null,
      eventType: 'calendar_health_failure',
      scopes: [],
      metadata: { failure_count: nextFailureCount },
    });
  }
}

async function runHealthCheck() {
  try {
    const targets = await listActiveCalendarTokens(HEALTH_BATCH_SIZE);
    for (const record of targets) {
      if (!record.refresh_token) continue;
      try {
        await refreshTokenForUser(record);
      } catch (error) {
        console.warn('[GoogleHealthMonitor] refresh failed', error.message);
        await handleRefreshFailure(record);
      }
    }
  } catch (error) {
    console.error('[GoogleHealthMonitor] batch error', error);
  }
}

export function startGoogleHealthMonitor() {
  if (monitorTimer || !googleConfig.healthIntervalMs) {
    return;
  }
  monitorTimer = setInterval(runHealthCheck, googleConfig.healthIntervalMs);
  console.log(`[GoogleHealthMonitor] scheduled every ${googleConfig.healthIntervalMs / 1000}s`);
}

