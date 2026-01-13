import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prefer backend/.env; fallback to repo root .env for monorepo starts
const localEnvPath = resolve(__dirname, '.env');
const rootEnvPath = resolve(__dirname, '../.env');
dotenv.config({ path: fs.existsSync(localEnvPath) ? localEnvPath : rootEnvPath });

// Quick presence checks before Supabase initializes



// Mask helpers to avoid leaking secrets in logs
function maskValue(value) {
  if (!value) return 'missing';
  const str = String(value);
  if (str.length <= 8) return `${str[0]}***${str[str.length - 1]} (len ${str.length})`;
  return `${str.slice(0, 4)}***${str.slice(-4)} (len ${str.length})`;
}

function safeOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return 'invalid-url';
  }
}

// Startup env summary (masked/safe)
console.log('Env at startup:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  CORS_ORIGINS: "http://localhost:3000" || process.env.CORS_ORIGINS || '',
  FRONTEND_URL: "http://localhost:5000" || process.env.FRONTEND_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL ? safeOrigin(process.env.SUPABASE_URL) : 'missing',
  SUPABASE_SERVICE_ROLE_KEY: maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
  OPENAI_API_KEY: maskValue(process.env.OPENAI_API_KEY),
  TWILIO_ACCOUNT_SID: maskValue(process.env.TWILIO_ACCOUNT_SID),
  TWILIO_AUTH_TOKEN: maskValue(process.env.TWILIO_AUTH_TOKEN),
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? 'set' : 'missing',
});


