import crypto from 'node:crypto';

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (!value || now - value.createdAt > SESSION_TTL_MS) {
      store.delete(key);
    }
  }
}

export function createOAuthSession(metadata) {
  prune();
  const sessionId = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  store.set(sessionId, { ...metadata, nonce, createdAt: Date.now() });
  return `${sessionId}:${nonce}`;
}

export function consumeOAuthSession(stateParam) {
  prune();
  if (!stateParam || typeof stateParam !== 'string' || !stateParam.includes(':')) {
    return null;
  }
  const [sessionId, nonce] = stateParam.split(':');
  const record = store.get(sessionId);
  if (!record || record.nonce !== nonce) {
    return null;
  }
  store.delete(sessionId);
  return record;
}

