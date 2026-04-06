import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Phone, FileText, ImagePlus } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const RegisterPage: React.FC = () => {
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
      Object.keys(metadata).forEach(key => {
        if (!['name', 'phone', 'description', 'logo', 'signup_method'].includes(key)) {
          delete (metadata as any)[key];
        }
      });
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: metadata
        }
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
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <SplitAuthLayout
      logoUrl={LOGO_URL}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      quote={t('register.quote')}
      reverse
    >
      {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-1">{t('register.title')}</h2>
          <p className="text-sm text-muted">{t('register.subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name + Email row */}
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

          {/* Phone */}
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

          {/* Password row */}
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

          {/* Description */}
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

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-navy-800 mb-1.5">{t('register.logoLabel')}</label>
            <label
              htmlFor="file-upload"
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
                id="file-upload"
                name="file-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="sr-only"
              />
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 text-center font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
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

        {/* Footer */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-muted text-sm">
            {t('register.alreadyHaveAccount')}{' '}
            <button
              className="text-primary hover:text-primary-light font-semibold hover:underline transition-colors"
              onClick={() => navigate('/login')}
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
    </SplitAuthLayout>
  );
};

export default RegisterPage;
