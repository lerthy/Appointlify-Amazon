import { supabase } from './supabaseClient';

/**
 * Fetches a fresh access token from Supabase, refreshing if necessary
 */
async function getFreshAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }
  if (!data.session?.access_token) {
    throw new Error('No active session found. Please log in again.');
  }
  return data.session.access_token;
}

/**
 * Makes an authenticated API request with automatic token refresh on 401 errors
 * 
 * @param url - The API endpoint URL
 * @param options - Fetch options (headers, method, body, etc.)
 * @param retryOn401 - Whether to retry once after refreshing token on 401 (default: true)
 * @returns The response data
 */
export async function authenticatedFetch<T = any>(
  url: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T> {
  const makeRequest = async (token: string): Promise<Response> => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  try {
    // Get fresh token
    const token = await getFreshAccessToken();
    
    // Make the request
    let response = await makeRequest(token);

    // If we get a 401 and retry is enabled, try refreshing the session once
    if (response.status === 401 && retryOn401) {
      console.log('[authenticatedFetch] Got 401, refreshing session and retrying...');
      
      // Force refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }
      
      // Retry the request with the new token
      response = await makeRequest(refreshData.session.access_token);
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      // Return empty object for non-JSON successful responses
      return {} as T;
    }

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

