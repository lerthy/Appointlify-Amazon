import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return setError('Invalid or missing token.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setIsSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setMessage('Your password has been reset. You can now sign in.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError('Unable to reset password. The link may have expired.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageTransition>
      <SplitAuthLayout
        logoUrl={LOGO_URL}
        title="Set a new password"
        subtitle="Choose a strong password you don\'t use elsewhere."
        quote="Your security matters."
      >
        <button onClick={() => navigate('/login')} className="mb-4 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to sign in
        </button>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200" placeholder="New password" required />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200" placeholder="Confirm new password" required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded p-2 text-center">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-2 text-center">{message}</div>}
          <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Reset password'}
          </button>
        </form>
      </SplitAuthLayout>
    </AuthPageTransition>
  );
};

export default ResetPasswordPage;


