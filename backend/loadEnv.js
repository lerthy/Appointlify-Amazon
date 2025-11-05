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
console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);


