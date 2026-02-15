import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';
import Button from '../components/ui/Button';
import { useNotification } from '../context/NotificationContext';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!form.email || !form.password) {
      const msg = 'Please enter both email and password.';
      setError(msg);
      showNotification(msg, 'error');
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
        const msg = signInError.message.includes('Email not confirmed')
          ? 'Please verify your email address before logging in. Check your inbox for the verification link.'
          : signInError.message.includes('Invalid login credentials')
            ? 'Invalid email or password.'
            : signInError.message;
        setError(msg);
        showNotification(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        const msg = 'Invalid email or password.';
        setError(msg);
        showNotification(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      // Check if email is confirmed (Supabase)
      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        const msg = 'Please verify your email address before logging in. Check your inbox for the verification link.';
        setError(msg);
        showNotification(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      // Get user profile (created automatically by database trigger during registration)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      // If profile doesn't exist, something went wrong - user should register
      if (profileError || !profileData) {
        console.error('Profile not found for authenticated user:', {
          userId: authData.user.id,
          email: authData.user.email,
          error: profileError
        });
        await supabase.auth.signOut();
        const msg = 'No account found. Please register first or contact support if you believe this is an error.';
        setError(msg);
        showNotification(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      // Enforce email verification for email signups (profile.email_verified from our DB)
      if (profileData.email_verified === false) {
        await supabase.auth.signOut();
        const msg = 'Please verify your email address before logging in. Check your inbox for the verification link.';
        setError(msg);
        showNotification(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      // Log in the user
      login(profileData);
      setIsSubmitting(false);
      showNotification('Welcome back!', 'success');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      setError(message);
      showNotification(message, 'error');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
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
      showNotification(message, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageTransition>
        <SplitAuthLayout
          logoUrl={LOGO_URL}
          title="Welcome Back!"
          subtitle="Sign in to access your personalized dashboard and explore new features."
          quote="Empowering your journey, one login at a time."
        >
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 top-0 flex items-center text-primary hover:text-primary-light transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Sign in to your account</h2>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            {isSubmitting ? 'Signing in…' : 'Continue with Google'}
          </button>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-primary focus:border-black text-sm transition-all duration-200"
                placeholder="Email address"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-primary focus:border-black text-sm transition-all duration-200"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded p-2 text-center">
                {error}
              </div>
            )}
            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-1">
            <p className="text-gray-600 text-xs">
              Don't have an account?{' '}
              <button
                className="text-primary hover:text-primary-light font-medium hover:underline transition-colors"
                onClick={() => navigate('/register')}
              >
                Sign up
              </button>
            </p>
            <p className="text-[11px] text-gray-500">
              Grant access so we may sync thy bookings with thine own Google Calendar (optional now, available later in Settings).
            </p>
            <p className="text-primary text-xs">
              Forgot password?{' '}
              <button
                className="underline cursor-pointer"
                onClick={() => navigate('/forgot-password')}
              >
                Click to reset
              </button>
            </p>
          </div>
        </SplitAuthLayout>
      </AuthPageTransition>
    </>
  );
};

export default LoginPage; 