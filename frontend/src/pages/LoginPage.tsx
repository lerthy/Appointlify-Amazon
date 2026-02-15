import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setIsEmailNotVerified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!form.email || !form.password) {
      setError(t('login.errors.fillBoth'));
      setIsSubmitting(false);
      return;
    }

    try {
      // Use Supabase Auth to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setError(t('login.errors.verifyEmail'));
          setIsEmailNotVerified(true);
        } else if (signInError.message.includes('Invalid login credentials')) {
          setError(t('login.errors.invalidCredentials'));
          setIsEmailNotVerified(false);
        } else {
          setError(signInError.message);
          setIsEmailNotVerified(false);
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError(t('login.errors.invalidCredentials'));
        setIsEmailNotVerified(false);
        setIsSubmitting(false);
        return;
      }

      // Check if email is confirmed
      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError(t('login.errors.verifyEmail'));
        setIsEmailNotVerified(true);
        setIsSubmitting(false);
        return;
      }
      setIsEmailNotVerified(false);

      // Get or create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      let userData = profileData;

      // If profile doesn't exist, create it
      if (profileError || !userData) {
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([{
            auth_user_id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0],
            signup_method: 'email'
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          setError(t('login.errors.profileError'));
          setIsSubmitting(false);
          return;
        }

        userData = newProfile;

        // Create default business settings for new user
        const { createDefaultBusinessSettings } = await import('../utils/createDefaultBusinessSettings');
        await createDefaultBusinessSettings(newProfile.id, newProfile.name || 'Business');
      }

      // Log in the user
      login(userData);
      setIsSubmitting(false);
      console.log('[LoginPage] Login successful, redirecting to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.email?.trim() || isResendLoading) return;
    setIsResendLoading(true);
    try {
      const body = JSON.stringify({ email: form.email.trim() });
      const headers = { 'Content-Type': 'application/json' };
      let res = await fetch('/api/verify-email', { method: 'POST', headers, body });
      if (!res.ok) {
        res = await fetch('/.netlify/functions/verify-email', { method: 'POST', headers, body });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showNotification(t('login.resendVerificationSent'), 'success');
      } else {
        showNotification(t('login.resendVerificationFailed'), 'error');
      }
    } catch {
      showNotification(t('login.resendVerificationFailed'), 'error');
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsEmailNotVerified(false);
      setIsSubmitting(true);
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/google`,
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (googleError) {
        throw googleError;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Google login';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageTransition>
        <SplitAuthLayout
          logoUrl={LOGO_URL}
          title={t('login.title')}
          subtitle={t('login.subtitle')}
          quote={t('login.quote')}
        >
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 top-0 flex items-center text-primary hover:text-primary-light transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{t('login.signInTitle')}</h2>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mb-4"
            disabled={isSubmitting}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            {t('login.continueWithGoogle')}
          </button>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('login.emailLabel')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-primary focus:border-black text-sm transition-all duration-200"
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('login.passwordLabel')}</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-primary focus:border-black text-sm transition-all duration-200"
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
            </div>
            {isEmailNotVerified && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-amber-800 font-medium">
                  {t('login.emailNotVerifiedBanner')}
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendLoading || !form.email?.trim()}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResendLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('login.resendVerification')}
                    </span>
                  ) : (
                    t('login.resendVerification')
                  )}
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded p-2 text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('login.signingIn')}
                </span>
              ) : (
                t('login.signInButton')
              )}
            </button>
          </form>
          <div className="mt-4 text-center space-y-1">
            <p className="text-gray-600 text-xs">
              {t('login.noAccount')}{' '}
              <button
                className="text-primary hover:text-primary-light font-medium hover:underline transition-colors"
                onClick={() => navigate('/register')}
              >
                {t('login.signUp')}
              </button>
            </p>
            <p className="text-[11px] text-gray-500">
              {t('login.googleCalendarNote')}
            </p>
            <p className="text-primary text-xs">
              {t('login.forgotPassword')}{' '}
              <button
                className="underline cursor-pointer"
                onClick={() => navigate('/forgot-password')}
              >
                {t('login.clickToReset')}
              </button>
            </p>
          </div>
        </SplitAuthLayout>
      </AuthPageTransition>
    </>
  );
};

export default LoginPage; 