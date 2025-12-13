import { useCallback, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { authenticatedFetch } from '../utils/apiClient';

type ScopeOption = 'identity' | 'calendar' | 'both';

type OAuthPopupMessage = {
  success: boolean;
  [key: string]: unknown;
};

const API_BASE = import.meta.env.VITE_API_URL || '';

function resolveApiOrigin() {
  if (!API_BASE) return window.location.origin;
  try {
    return new URL(API_BASE).origin;
  } catch {
    return window.location.origin;
  }
}

const DEFAULT_POPUP_FEATURES = 'width=520,height=720,menubar=no,toolbar=no,status=no';

export function useGoogleOAuth(scope: ScopeOption = 'calendar') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiOrigin = useMemo(() => resolveApiOrigin(), []);
  const backendOrigin = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return new URL(API_BASE).origin;
    } catch {
      return null;
    }
  }, []);
  const allowAnyOrigin = !API_BASE;

  const launch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { url } = await authenticatedFetch<{ url: string }>(
        `${API_BASE}/api/auth/google?scope=${scope}`,
        { method: 'GET' }
      );
      if (!url) throw new Error('OAuth URL missing');

      const popup = window.open(url, 'google-oauth', DEFAULT_POPUP_FEATURES);
      if (!popup) throw new Error('Popup was blocked. Please allow popups for this site.');

      const result = await new Promise<OAuthPopupMessage>((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('OAuth flow timed out. Please try again.'));
        }, 120000);

        // Track if we've resolved to prevent multiple resolutions
        let resolved = false;

        function handler(event: MessageEvent) {
          if (resolved) return;

          console.log('[useGoogleOAuth] Received message event:', {
            origin: event.origin,
            data: event.data,
            allowAnyOrigin,
            apiOrigin,
            backendOrigin,
            windowOrigin: window.location.origin
          });

          // Check if message has the expected OAuth response format
          if (!event.data || typeof event.data !== 'object' || !('success' in event.data)) {

            return;
          }

          // Accept messages from OAuth callback based on origin and data format
          // Don't check popup.closed (blocked by COOP/COEP for cross-origin)
          const isFromOAuthCallback =
            event.data.success !== undefined && // Has OAuth response format
            (event.origin.includes('localhost') ||
              event.origin.includes('netlify') ||
              event.origin === apiOrigin ||
              event.origin === window.location.origin ||
              (backendOrigin && event.origin === backendOrigin));

          if (!isFromOAuthCallback) {

            return;
          }

          // Accept messages from:
          // 1. Any origin if allowAnyOrigin is true (when API_BASE is not set)
          // 2. Frontend origin (apiOrigin) - when frontend and backend are same origin
          // 3. Backend origin - when OAuth callback posts from backend server
          // 4. localhost or netlify domains (OAuth callback origins)
          if (!allowAnyOrigin) {
            const isValidOrigin =
              event.origin === apiOrigin ||
              (backendOrigin && event.origin === backendOrigin) ||
              event.origin === window.location.origin ||
              event.origin.includes('localhost') || // Allow localhost variations
              event.origin.includes('netlify'); // Allow Netlify domains
            if (!isValidOrigin) {

              return;
            }
          }


          resolved = true;
          clearTimeout(timeout);
          window.removeEventListener('message', handler);

          resolve(event.data);
        }

        window.addEventListener('message', handler);
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Google OAuth';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [allowAnyOrigin, apiOrigin, backendOrigin, scope]);

  return {
    launch,
    loading,
    error,
  };
}

