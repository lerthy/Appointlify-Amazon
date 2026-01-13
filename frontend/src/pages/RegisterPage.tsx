import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import AuthPageTransition from '../components/shared/AuthPageTransition';

// RegisterPage component for user registration

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
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
    // Upload logo first if provided
    let logoUrl = '';
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
      if (uploadError) {
        setError('Failed to upload logo: ' + uploadError.message);
        setIsSubmitting(false);
        return;
      }
      logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
    }
    // Debug: log the payload sent to Supabase
    console.log('Payload sent to Supabase:', {
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: form.name,
          phone: form.phone,
          description: form.description,
          logo: logoUrl
        }
      }
    });
    setIsSubmitting(true);
    
    if (!form.name || !form.email || !form.password || !form.confirm || !form.description || !form.phone) {
      setError('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }
    
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Check if user already exists in the users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();
      
      if (existingUser) {
        setError('An account with this email already exists. Please sign in instead.');
        setIsSubmitting(false);
        return;
      }

      // Upload logo first if provided
      let logoUrl = '';
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (uploadError) {
          setError('Failed to upload logo: ' + uploadError.message);
          setIsSubmitting(false);
          return;
        }
        logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      }

      // Register user with Supabase Auth
      // Only send allowed metadata fields (sanitize logoUrl and never spread form object)
      const metadata = {
        name: form.name,
        phone: form.phone,
        description: form.description,
        logo: logoUrl
      };
      // Remove any accidental extra fields
      Object.keys(metadata).forEach(key => {
        if (!["name", "phone", "description", "logo"].includes(key)) {
          delete metadata[key];
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
        setError('Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success! The database trigger will automatically create the user profile
      // User needs to verify their email before they can log in
      console.log('[Registration] ✅ Auth account created:', {
        userId: authData.user.id,
        email: authData.user.email,
        emailConfirmedAt: authData.user.email_confirmed_at
      });
      
      console.log('[Registration] ✅ User profile will be created automatically by database trigger');

      setIsSubmitting(false);
      alert('Registration successful! Please check your email to verify your account. You must verify your email before you can log in.');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
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
      if (googleError) throw googleError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Google sign up';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageTransition>
        <SplitAuthLayout
          logoUrl={LOGO_URL}
          title="Create Account"
          subtitle="Join Appointly today"
          quote="Start your journey with us."
          reverse
        >
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 top-0 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <form onSubmit={handleSubmit} className="space-y-3 pt-12 md:pt-10">
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mb-2"
              disabled={isSubmitting}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Sign up with Google
            </button>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black text-sm transition-all duration-200"
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black text-sm transition-all duration-200"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black text-sm transition-all duration-200"
                placeholder="Your phone number"
                autoComplete="tel"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black text-sm transition-all duration-200"
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black text-sm transition-all duration-200"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Company Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-black focus:ring-2 focus:ring-indigo-500 focus:border-black transition-all resize-none text-sm"
                placeholder="Describe your company"
                required
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Company Logo</label>
              <div className={`mt-1 flex justify-center px-4 pt-3 pb-4 border-2 border-dashed rounded-lg transition-all ${
                logoFile 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-indigo-500'
              }`}>
                <div className="space-y-1 text-center">
                  {logoFile ? (
                    <>
                      <svg
                        className="mx-auto h-8 w-8 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs font-medium text-green-600">{logoFile.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(logoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-8 w-8 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-[10px] text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </>
                  )}
                  <div className="flex text-xs text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-1"
                    >
                      <span>{logoFile ? 'Change file' : 'Upload a file'}</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="sr-only"
                      />
                    </label>
                    {!logoFile && <p className="pl-1">or drag and drop</p>}
                  </div>
                </div>
              </div>
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-xs">
              Already have an account?{' '}
              <button
                className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </p>
            <p className="text-[11px] text-gray-500">
              Grant access so we may sync thy bookings with thine own Google Calendar (optional during setup).
            </p>
          </div>
        </SplitAuthLayout>
      </AuthPageTransition>
    </>
  );
};

export default RegisterPage; 