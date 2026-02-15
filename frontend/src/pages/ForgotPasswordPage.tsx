import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email.trim()) {
      setError(t('forgotPassword.errors.enterEmail'));
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError(t('forgotPassword.errors.invalidEmail'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/.netlify/functions/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || t('forgotPassword.successMessage'));
        setEmail(''); // Clear the form
      } else if (response.status === 429) {
        setError(data.error || t('forgotPassword.errors.tooManyRequests'));
      } else {
        setError(data.error || t('common.error'));
      }
    } catch (fetchError) {
      console.error('Network error:', fetchError);
      setError(t('forgotPassword.errors.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageTransition>
      <SplitAuthLayout
        logoUrl={LOGO_URL}
        title={t('forgotPassword.title')}
        subtitle={t('forgotPassword.subtitle')}
        quote={t('forgotPassword.quote')}
      >
        <button onClick={() => navigate('/login')} className="mb-4 flex items-center text-primary hover:text-primary-light transition-colors duration-200">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('forgotPassword.backToSignIn')}
        </button>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">{t('forgotPassword.emailLabel')}</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200 ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary'
              }`}
              placeholder={t('forgotPassword.emailPlaceholder')} 
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2 text-center">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-2 text-center">{message}</div>}
          <button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
          </button>
        </form>
      </SplitAuthLayout>
    </AuthPageTransition>
  );
};

export default ForgotPasswordPage;


