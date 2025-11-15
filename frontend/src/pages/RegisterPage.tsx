import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import SplitAuthLayout from '../components/shared/SplitAuthLayout';
import { hashPassword } from '../utils/password';
import AuthPageTransition from '../components/shared/AuthPageTransition';

// RegisterPage component for user registration

const LOGO_URL = "https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', description: '' });
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
    setIsSubmitting(true);
    if (!form.name || !form.email || !form.password || !form.confirm || !form.description) {
      setError('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }
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
    // Hash password before saving
    const passwordHash = await hashPassword(form.password);
    const { data: userData, error: insertError } = await supabase.from('users').insert([
      {
        name: form.name,
        email: form.email,
        password_hash: passwordHash,
        description: form.description,
        logo: logoUrl,
      }
    ]).select().single();
    
    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    // Create default business settings for the new user
    if (userData) {
      const defaultWorkingHours = [
        { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
        { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
      ];

      const { error: settingsError } = await supabase.from('business_settings').insert([
        {
          business_id: userData.id,
          name: form.name,
          working_hours: defaultWorkingHours,
          blocked_dates: [],
          breaks: [],
          appointment_duration: 30
        }
      ]);

      if (settingsError) {
        console.error('Failed to create business settings:', settingsError);
        // Don't fail the registration, just log the error
      }

      // Create default services for the new business
      const defaultServices = [
        {
          business_id: userData.id,
          name: 'Consultation',
          description: 'Initial consultation and assessment',
          duration: 30,
          price: 25.00
        },
        {
          business_id: userData.id,
          name: 'Basic Service',
          description: 'Standard service offering',
          duration: 60,
          price: 50.00
        }
      ];

      const { error: servicesError } = await supabase.from('services').insert(defaultServices);

      if (servicesError) {
        console.error('Failed to create default services:', servicesError);
        // Don't fail the registration, just log the error
      }

      // Create a default employee for the business
      const { error: employeeError } = await supabase.from('employees').insert([
        {
          business_id: userData.id,
          name: 'Main Staff',
          email: form.email,
          phone: '+1234567890',
          role: 'Service Provider'
        }
      ]);

      if (employeeError) {
        console.error('Failed to create default employee:', employeeError);
        // Don't fail the registration, just log the error
      }
    }

    setIsSubmitting(false);
    alert('Registered! You can now log in.');
    navigate('/login');
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
            className="absolute -left-2 -top-2 md:left-4 md:top-4 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-full shadow-lg hover:shadow-xl border border-indigo-100 hover:border-indigo-200 transition-all duration-200 z-30 group"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          {/* <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Create your account</h2> */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200"
                placeholder="you@example.com"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm"
                placeholder="Describe your company"
                required
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Company Logo</label>
              <div className="mt-1 flex justify-center px-4 pt-3 pb-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors">
                <div className="space-y-1 text-center">
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
                  <div className="flex text-xs text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-[10px] text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
          </div>
        </SplitAuthLayout>
      </AuthPageTransition>
    </>
  );
};

export default RegisterPage; 