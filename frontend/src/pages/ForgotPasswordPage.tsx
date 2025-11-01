import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
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
      setError('Please enter your email address.');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
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
        setMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
        setEmail(''); // Clear the form
      } else if (response.status === 429) {
        setError(data.error || 'Too many requests. Please wait before trying again.');
      } else {
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch (fetchError) {
      console.error('Network error:', fetchError);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageTransition>
      <SplitAuthLayout
        logoUrl={LOGO_URL}
        title="Forgot your password?"
        subtitle="Enter your email to receive a reset link."
        quote="We never disclose whether an email exists."
      >
        <button onClick={() => navigate('/login')} className="mb-4 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to sign in
        </button>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Email address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200 ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Enter your email address" 
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2 text-center">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-2 text-center">{message}</div>}
          <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </SplitAuthLayout>
    </AuthPageTransition>
  );
};

export default ForgotPasswordPage;


