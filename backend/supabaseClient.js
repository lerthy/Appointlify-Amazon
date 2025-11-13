import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceRoleKey) {
	supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	console.log('✅ Supabase client initialized');
} else {
	console.warn('Supabase backend env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server will run with limited DB features)');
}
export { supabase };




