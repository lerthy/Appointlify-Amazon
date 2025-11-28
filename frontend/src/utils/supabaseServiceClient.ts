// IMPORTANT: Never load or use service-role keys in the browser.
// This helper now reuses the existing supabase client to avoid multiple instances.
// For profile updates, use the backend API instead of direct Supabase calls.
import { supabase } from './supabaseClient';

// Reuse the existing client to avoid multiple GoTrueClient instances
export const createServiceClient = () => {
  // Return the singleton supabase client instance
  return supabase;
};
