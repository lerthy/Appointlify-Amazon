import { createClient } from '@supabase/supabase-js';

// Service role client for operations that need to bypass RLS
// This is used when the app's custom auth system needs admin-level access
export const createServiceClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('🔍 Environment check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    hasAnonKey: !!supabaseAnonKey,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    serviceKeyPreview: supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 20)}...` : 'missing'
  });

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is missing');
  }

  // Fallback: Use anon key if service role key is not available
  const keyToUse = supabaseServiceRoleKey || supabaseAnonKey;
  
  if (!keyToUse) {
    throw new Error('Both VITE_SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_ANON_KEY are missing');
  }

  console.log(`🔑 Using ${supabaseServiceRoleKey ? 'SERVICE ROLE' : 'ANON'} key for client`);

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
