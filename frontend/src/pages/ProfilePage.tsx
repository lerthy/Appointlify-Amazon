import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { createServiceClient } from '../utils/supabaseServiceClient';
import { hashPassword, verifyPassword } from '../utils/password';
import Header from '../components/shared/Header';

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    description: user?.description || '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  if (!user) {
    return <div className="p-8 text-center text-red-600 font-bold">Please log in to edit your profile.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let logoUrl = user.logo || '';
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile, { upsert: true });
      if (uploadError) {
        setError('Failed to upload logo: ' + uploadError.message);
        setIsSubmitting(false);
        return;
      }
      logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
    }
    // Use service client to bypass RLS for profile updates
    let serviceClient;
    try {
      serviceClient = createServiceClient();
      console.log('✅ Service client created successfully');
    } catch (error) {
      console.error('❌ Failed to create service client:', error);
      setError('Configuration error. Please contact support.');
      setIsSubmitting(false);
      return;
    }
    
    const { data, error: updateError } = await serviceClient
      .from('users')
      .update({
        name: form.name,
        email: form.email,
        description: form.description,
        logo: logoUrl,
      })
      .eq('id', user.id)
      .select('*');
      
    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }
    
    if (!data || data.length === 0) {
      setError('User not found or no changes were made');
      setIsSubmitting(false);
      return;
    }
    
    if (data.length > 1) {
      setError('Multiple user records found. Please contact support.');
      setIsSubmitting(false);
      return;
    }
    
    login(data[0]); // update context/localStorage
    setSuccess('Profile updated!');
    setIsSubmitting(false);
  };

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
    setPwError('');
    setPwSuccess('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSubmitting(true);
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current || !pwForm.new || !pwForm.confirm) {
      setPwError('Please fill in all fields.');
      setPwSubmitting(false);
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      setPwSubmitting(false);
      return;
    }
    // Fetch current password hash using service client
    const serviceClient = createServiceClient();
    const { data: userRow, error: fetchError } = await serviceClient
      .from('users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single();
    if (fetchError || !userRow) {
      setPwError('Unable to verify current password.');
      setPwSubmitting(false);
      return;
    }
    const matches = await verifyPassword(pwForm.current, userRow.password_hash);
    if (!matches) {
      setPwError('Current password is incorrect.');
      setPwSubmitting(false);
      return;
    }
    // Update password with hash using service client
    const newHash = await hashPassword(pwForm.new);
    const { error: updateError } = await serviceClient
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);
    if (updateError) {
      setPwError(updateError.message);
      setPwSubmitting(false);
      return;
    }
    setPwSuccess('Password changed successfully!');
    setPwForm({ current: '', new: '', confirm: '' });
    setPwSubmitting(false);
    setShowPasswordModal(false);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2 tracking-tight">Edit Profile</h2>
          <div className="flex justify-center mb-6">
            <label htmlFor="logo-upload" className="relative cursor-pointer group">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} alt="New logo preview" className="h-24 w-24 rounded-full object-cover border-2 border-indigo-200 group-hover:opacity-80 transition-opacity duration-200" />
              ) : user.logo ? (
                <img src={user.logo} alt="Current logo" className="h-24 w-24 rounded-full object-cover border-2 border-indigo-200 shadow group-hover:opacity-80 transition-opacity duration-200" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-4xl text-indigo-700 font-bold border-4 border-indigo-200 shadow">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200">Change</span>
            </label>
          </div>
          <hr className="mb-6 border-indigo-100" />
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100 resize-none" rows={5} />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded p-2 text-center">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-2 text-center">{success}</div>}

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-violet-600 hover:to-indigo-600 text-white font-semibold py-2 rounded-lg text-base transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 shadow" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="flex-1 bg-gray-100 hover:bg-indigo-100 text-violet-700 font-semibold py-2 rounded-lg text-base transition-all duration-200 border border-indigo-200 hover:border-violet-600" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
                <input type="password" name="current" value={pwForm.current} onChange={handlePwChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-white" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                <input type="password" name="new" value={pwForm.new} onChange={handlePwChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-white" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" name="confirm" value={pwForm.confirm} onChange={handlePwChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-white" required />
              </div>
              {pwError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded p-2 text-center">{pwError}</div>}
              {pwSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-2 text-center">{pwSuccess}</div>}
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow" disabled={pwSubmitting}>
                {pwSubmitting ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
