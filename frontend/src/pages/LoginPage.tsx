import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';

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

      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError(t('login.errors.verifyEmail'));
        setIsEmailNotVerified(true);
        setIsSubmitting(false);
        return;
      }
      setIsEmailNotVerified(false);

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      let userData = profileData;

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

        const { createDefaultBusinessSettings } = await import('../utils/createDefaultBusinessSettings');
        await createDefaultBusinessSettings(newProfile.id, newProfile.name || 'Business');
      }

      login(userData);
      setIsSubmitting(false);
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

  return (
    <SplitAuthLayout
      logoUrl={LOGO_URL}
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      quote={t('login.quote')}
    >
      {/* Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-900 mb-1">{t('login.signInTitle')}</h2>
          <p className="text-sm text-muted">{t('login.subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('login.emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-navy-800">{t('login.passwordLabel')}</label>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-light font-medium transition-colors"
                onClick={() => navigate('/forgot-password')}
              >
                {t('login.forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {/* Email verification banner */}
          {isEmailNotVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-amber-800 font-medium">
                {t('login.emailNotVerifiedBanner')}
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendLoading || !form.email?.trim()}
                className="shrink-0 px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResendLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          {/* Error message */}
          {error && !isEmailNotVerified && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 text-center font-medium">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 shadow-ghost-lg hover:shadow-ghost-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        {/* Footer links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-muted text-sm">
            {t('login.noAccount')}{' '}
            <button
              className="text-primary hover:text-primary-light font-semibold hover:underline transition-colors"
              onClick={() => navigate('/register')}
            >
              {t('login.signUp')}
            </button>
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary hover:text-primary-light underline underline-offset-2 transition-colors"
          >
            {t('header.goToHomepage')}
          </button>
        </div>
    </SplitAuthLayout>
  );
};

export default LoginPage;
