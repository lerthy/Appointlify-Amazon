import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, FileText, ImagePlus, Shield, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/* ─── Login Form ──────────────────────────────────────────────── */
const LoginForm: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
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
        password: form.password,
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
          .insert([
            {
              auth_user_id: authData.user.id,
              email: authData.user.email,
              name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0],
              signup_method: 'email',
            },
          ])
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
    <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg px-6 py-8 sm:px-8 sm:py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-1">{t('login.signInTitle')}</h2>
        <p className="text-sm text-muted">{t('login.subtitle')}</p>
      </div>

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

        {isEmailNotVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-amber-800 font-medium">{t('login.emailNotVerifiedBanner')}</p>
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

        {error && !isEmailNotVerified && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 text-center font-medium">
            {error}
          </div>
        )}

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

      <div className="mt-8 text-center space-y-3">
        <p className="text-muted text-sm">
          {t('login.noAccount')}{' '}
          <button
            className="text-primary hover:text-primary-light font-semibold hover:underline transition-colors"
            onClick={onSwitchToRegister}
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
    </div>
  );
};

/* ─── Register Form ───────────────────────────────────────────── */
const RegisterForm: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', description: '', phone: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let logoUrl = '';
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
      if (uploadError) {
        setError(t('register.errors.logoUploadFailed') + uploadError.message);
        setIsSubmitting(false);
        return;
      }
      logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
    }
    setIsSubmitting(true);

    if (!form.name || !form.email || !form.password || !form.confirm || !form.description || !form.phone) {
      setError(t('register.errors.fillAllFields'));
      setIsSubmitting(false);
      return;
    }

    if (form.password !== form.confirm) {
      setError(t('register.errors.passwordsNoMatch'));
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();

      if (existingUser) {
        setError(t('register.errors.accountExists'));
        setIsSubmitting(false);
        return;
      }

      let logoUrlFinal = '';
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (uploadError) {
          setError(t('register.errors.logoUploadFailed') + uploadError.message);
          setIsSubmitting(false);
          return;
        }
        logoUrlFinal = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      }

      const metadata = {
        name: form.name,
        phone: form.phone,
        description: form.description,
        logo: logoUrlFinal || logoUrl,
        signup_method: 'email',
      };
      Object.keys(metadata).forEach((key) => {
        if (!['name', 'phone', 'description', 'logo', 'signup_method'].includes(key)) {
          delete (metadata as any)[key];
        }
      });
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: metadata,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError(t('register.errors.createAccountFailed'));
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      alert(t('register.successMessage'));
      onSwitchToLogin();
    } catch (err) {
      console.error('Registration error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg px-6 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-1">{t('register.title')}</h2>
        <p className="text-sm text-muted">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.nameLabel')}</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('register.namePlaceholder')}
                autoComplete="name"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('register.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.phoneLabel')}</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
              placeholder={t('register.phonePlaceholder')}
              autoComplete="tel"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.passwordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('register.passwordPlaceholder')}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.confirmPasswordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none text-sm transition-all duration-200 placeholder:text-muted"
                placeholder={t('register.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.descriptionLabel')}</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all resize-none text-sm placeholder:text-muted"
              placeholder={t('register.descriptionPlaceholder')}
              required
              rows={2}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.logoLabel')}</label>
          <label
            htmlFor="file-upload-auth"
            className={`flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              logoFile
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-gray-200 hover:border-accent/40 hover:bg-surface text-muted'
            }`}
          >
            {logoFile ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <ImagePlus className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-navy-900 truncate">{logoFile.name}</p>
                  <p className="text-xs text-muted">{(logoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <span className="text-xs font-medium text-primary">{t('register.changeFile')}</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-sm font-medium">{t('register.uploadFile')}</span>
                <span className="text-xs text-muted">{t('register.fileTypes')}</span>
              </>
            )}
            <input
              id="file-upload-auth"
              name="file-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="sr-only"
            />
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 text-center font-medium">
            {error}
          </div>
        )}

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
              {t('register.creatingAccount')}
            </span>
          ) : (
            t('register.createAccountButton')
          )}
        </button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <p className="text-muted text-sm">
          {t('register.alreadyHaveAccount')}{' '}
          <button
            className="text-primary hover:text-primary-light font-semibold hover:underline transition-colors"
            onClick={onSwitchToLogin}
          >
            {t('register.signIn')}
          </button>
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-primary hover:text-primary-light underline underline-offset-2 transition-colors"
        >
          {t('header.goToHomepage')}
        </button>
      </div>
    </div>
  );
};

/* ─── Branding Panel (the dark panel that slides) ─────────────── */
const BrandingPanel: React.FC<{ isLogin: boolean }> = ({ isLogin }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const title = isLogin ? t('login.title') : t('register.title');
  const subtitle = isLogin ? t('login.subtitle') : t('register.subtitle');
  const quote = isLogin ? t('login.quote') : t('register.quote');

  return (
    <div className="w-full h-full bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden flex flex-col justify-between">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-accent/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[5%] w-80 h-80 bg-steel-400/8 rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] left-[40%] w-48 h-48 bg-white/[0.02] rounded-full blur-2xl"></div>
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
      </div>

      {/* Top - Brand */}
      <div className="relative z-10 pt-10 px-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
          <img src="/logo-white.png" alt="Appointly" className="h-9 group-hover:opacity-90 transition-opacity" />
          <span className="text-xl font-bold text-white tracking-tight group-hover:text-white/90 transition-colors">
            Appointly-ks
          </span>
        </button>
      </div>

      {/* Center - Animated content */}
      <div className="relative z-10 flex flex-col items-start px-10 lg:px-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-5 tracking-tight">{title}</h1>
            <p className="text-lg text-steel-300 mb-8 leading-relaxed max-w-md">{subtitle}</p>

            {quote && (
              <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06] max-w-md">
                <p className="text-steel-200 italic text-base leading-relaxed">"{quote}"</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-accent rounded-full"></div>
                  <span className="text-accent text-sm font-medium">Appointly Team</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom - Trust indicators */}
      <div className="relative z-10 px-10 pb-10">
        <div className="flex flex-wrap items-center gap-6 text-steel-400/60 text-xs">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Auth Page ──────────────────────────────────────────── */
const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');

  // Sync state when user navigates via browser back/forward
  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  const switchToRegister = () => {
    setIsLogin(false);
    navigate('/register', { replace: true });
  };

  const switchToLogin = () => {
    setIsLogin(true);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-background overflow-hidden">
      {/* ─── Desktop: sliding panel layout ─── */}
      <div className="hidden md:block relative h-screen w-full">
        {/* Form layers (behind the overlay) */}
        <div className="absolute inset-0 flex">
          {/* Left half: Login form */}
          <div
            className={`w-1/2 h-full overflow-y-auto flex items-center justify-center bg-gradient-to-br from-surface via-white to-surface/80 transition-opacity duration-500 ${
              isLogin ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <LoginForm onSwitchToRegister={switchToRegister} />
          </div>

          {/* Right half: Register form */}
          <div
            className={`w-1/2 h-full overflow-y-auto flex items-start justify-center bg-gradient-to-br from-surface via-white to-surface/80 transition-opacity duration-500 py-8 ${
              isLogin ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <RegisterForm onSwitchToLogin={switchToLogin} />
          </div>
        </div>

        {/* Sliding dark overlay panel */}
        <motion.div
          className="absolute top-0 h-full w-1/2 z-20 shadow-2xl"
          animate={{ x: isLogin ? '100%' : '0%' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <BrandingPanel isLogin={isLogin} />
        </motion.div>
      </div>

      {/* ─── Mobile: simple toggle, no sliding panel ─── */}
      <div className="md:hidden min-h-screen flex flex-col bg-gradient-to-br from-surface via-white to-surface/80">
        {/* Mobile header */}
        <div className="flex flex-col items-center text-center pt-10 pb-4 px-4 space-y-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-2">
            <img src="/logo-white.png" alt="Appointly" className="h-8" />
            <span className="text-xl font-bold text-primary">Appointly-ks</span>
          </button>
          <h1 className="text-xl font-extrabold text-navy-900">
            {isLogin ? t('login.title') : t('register.title')}
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            {isLogin ? t('login.subtitle') : t('register.subtitle')}
          </p>
        </div>

        <div className="flex-1 flex items-start justify-center px-4 pb-10">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login-mobile"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <LoginForm onSwitchToRegister={switchToRegister} />
              </motion.div>
            ) : (
              <motion.div
                key="register-mobile"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <RegisterForm onSwitchToLogin={switchToLogin} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
