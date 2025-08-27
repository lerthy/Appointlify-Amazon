import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { verifyPassword, hashPassword } from '../utils/password';
import { useAuth } from '../context/AuthContext';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
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
      setError('Please enter both email and password.');
      setIsSubmitting(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', form.email)
      .single();
    if (queryError || !data) {
      setError('Invalid email or password.');
      setIsSubmitting(false);
      return;
    }
    let isValid = await verifyPassword(form.password, data.password_hash);
    if (!isValid) {
      // Seamless migration for legacy plaintext passwords
      if (data.password_hash === form.password) {
        const newHash = await hashPassword(form.password);
        await supabase.from('users').update({ password_hash: newHash }).eq('id', data.id);
        isValid = true;
        data.password_hash = newHash;
      }
    }
    if (!isValid) {
      setError('Invalid email or password.');
      setIsSubmitting(false);
      return;
    }
    login(data);
    setIsSubmitting(false);
    navigate('/dashboard');
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
            className="mb-4 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return
          </button>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200"
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
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
          <div className="mt-4 text-center space-y-1">
            <p className="text-gray-600 text-xs">
              Don't have an account?{' '}
              <button
                className="text-purple-600 hover:text-purple-700 font-medium hover:underline transition-colors"
                onClick={() => navigate('/register')}
              >
                Sign up
              </button>
            </p>
            <p className="text-indigo-700 text-xs">
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