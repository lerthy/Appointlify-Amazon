import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useGoogleOAuth } from '../hooks/useGoogleOAuth';
import { authenticatedFetch } from '../utils/apiClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

type AppUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  signup_method?: string | null;
};

const GoogleOAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [calendarPromptVisible, setCalendarPromptVisible] = useState(false);
  const { launch, loading: calendarLoading, error: calendarError } = useGoogleOAuth('calendar');

  const callBackend = useCallback(async <T,>(path: string, options: RequestInit = {}) : Promise<T> => {
    return authenticatedFetch<T>(`${API_BASE}${path}`, options);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const sessionPayload = await callBackend<{ user?: AppUser }>('/api/auth/google/session', { method: 'POST' });
        if (sessionPayload?.user) {
          login(sessionPayload.user);
        }
        const statusPayload = await callBackend<{ linked: boolean }>('/api/integrations/google/status');
        if (statusPayload?.linked) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setCalendarPromptVisible(true);
      } catch (err) {
        console.error('[GoogleOAuthCallback] error', err);
        const message = err instanceof Error ? err.message : 'OAuth processing failed';
        setError(message);
      } finally {
        setProcessing(false);
      }
    };
    bootstrap();
  }, [callBackend, login, navigate]);

  const handleGrant = async () => {
    try {
      await launch();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to grant calendar access';
      setError(message);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Signing you in…</h1>
        {processing && (
          <p className="text-sm text-gray-600">We&apos;re finalizing your account with Google.</p>
        )}
        {!processing && calendarPromptVisible && (
          <>
            <p className="text-sm text-gray-700">
              Grant Google Calendar access so we may sync thy bookings with thine own calendar.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={handleGrant}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
                disabled={calendarLoading}
              >
                {calendarLoading ? 'Requesting permission…' : 'Grant Google Calendar access'}
              </button>
              <button
                onClick={handleSkip}
                className="w-full border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {calendarError && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {calendarError}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleOAuthCallbackPage;

