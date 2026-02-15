import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import Loader from '../components/ui/Loader';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useNotification } from '../context/NotificationContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      showNotification('No verification token provided.', 'error');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
            setMessage('Your email has already been verified');
            showNotification('Your email is already verified.', 'success');
          } else {
            setStatus('success');
            setMessage(data.message || 'Email verified successfully.');
            setEmail(data.email || '');
            showNotification('Email verified successfully. You can now log in.', 'success');
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
          showNotification(data.error || 'Verification failed.', 'error');
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        showNotification('Verification failed. Please try again.', 'error');
      }
    };

    verifyEmail();
  }, [token, showNotification]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-gray-900">
            Email Verification
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {status === 'verifying' && (
            <>
              <Loader size="lg" className="mb-4" />
              <p className="text-gray-600 text-center">Verifying your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Email Verified Successfully!
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Your email address <span className="font-semibold">{email}</span> has been verified.
                You can now log in to your account.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <CheckCircle className="w-16 h-16 text-accent mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Already Verified
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message}. You can log in to your account.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message}
              </p>
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Login
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
                >
                  Register New Account
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

