import { createClient } from '@supabase/supabase-js';

// Service role client for operations that need to bypass RLS
// This is used when the app's custom auth system needs admin-level access
export const createServiceClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Environment check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    serviceKeyPreview: supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 20)}...` : 'missing'
  });

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(`Supabase credentials are missing. URL: ${!!supabaseUrl}, ServiceKey: ${!!supabaseServiceRoleKey}`);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
