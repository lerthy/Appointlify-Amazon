import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useNotification } from '../context/NotificationContext';

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResendLoading, setIsResendLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/.netlify/functions/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
            setMessage('Your email has already been verified');
          } else {
            setStatus('success');
            setMessage(data.message);
            setEmail(data.email);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resendEmail?.trim() || isResendLoading) return;
    setIsResendLoading(true);
    try {
      const body = JSON.stringify({ email: resendEmail.trim() });
      const headers = { 'Content-Type': 'application/json' };
      let res = await fetch('/api/verify-email', { method: 'POST', headers, body });
      if (!res.ok) {
        res = await fetch('/.netlify/functions/verify-email', { method: 'POST', headers, body });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showNotification(t('verifyEmail.resendVerificationSent'), 'success');
      } else {
        showNotification(t('verifyEmail.resendVerificationFailed'), 'error');
      }
    } catch {
      showNotification(t('verifyEmail.resendVerificationFailed'), 'error');
    } finally {
      setIsResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-gray-900">
            {t('verifyEmail.title')}
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {status === 'verifying' && (
            <>
              <Loader className="w-16 h-16 text-primary animate-spin mb-4" />
              <p className="text-gray-600 text-center">{t('verifyEmail.verifying')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('verifyEmail.success')}
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {t('verifyEmail.successMessage')}
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
              >
                {t('verifyEmail.goToLogin')}
              </Button>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <CheckCircle className="w-16 h-16 text-primary mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('verifyEmail.alreadyVerified')}
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {t('verifyEmail.alreadyVerifiedMessage')}
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
              >
                {t('verifyEmail.goToLogin')}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('verifyEmail.failed')}
              </h2>
              <p className="text-gray-600 text-center mb-4">
                {t('verifyEmail.failedMessage')}
              </p>
              <div className="w-full mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('verifyEmail.resendVerification')}</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendLoading || !resendEmail?.trim()}
                    className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                  >
                    {isResendLoading && <Loader className="h-4 w-4 animate-spin" />}
                    {t('verifyEmail.resendVerification')}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="w-full"
                >
                  {t('verifyEmail.goToLogin')}
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
                >
                  {t('verifyEmail.registerNewAccount')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;

