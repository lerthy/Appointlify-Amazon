import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-gray-900">
            Email Verification
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {status === 'verifying' && (
            <>
              <Loader className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
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
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <CheckCircle className="w-16 h-16 text-blue-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Already Verified
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message}. You can log in to your account.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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

