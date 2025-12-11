import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { extractCoordinates, isValidCoordinates } from '../utils/coordinates';
import Header from '../components/shared/Header';
import { MapPin, Phone, Globe, Briefcase, User, CheckCircle, XCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    description: user?.description || '',
    phone: user?.phone || '',
    businessAddress: user?.business_address || '',
    website: user?.website || '',
    category: user?.category || '',
    ownerName: user?.owner_name || '',
    subdomain: user?.subdomain || '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Sync form with user data when user changes
  useEffect(() => {
    if (user) {
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        description: user?.description || '',
        phone: user?.phone || '',
        businessAddress: user?.business_address || '',
        website: user?.website || '',
        category: user?.category || '',
        ownerName: user?.owner_name || '',
        subdomain: user?.subdomain || '',
      });
    }
  }, [user]);

  const categories = [
    'Health & Wellness',
    'Beauty & Spa',
    'Fitness',
    'Education',
    'Professional Services',
    'Medical',
    'Legal',
    'Consulting',
    'Automotive',
    'Home Services',
    'Entertainment',
    'Other'
  ];

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Extract coordinates when address changes
  useEffect(() => {
    if (form.businessAddress) {
      const extracted = extractCoordinates(form.businessAddress);
      if (extracted && isValidCoordinates(extracted)) {
        setCoords(extracted);
        setShowMap(true);
      } else {
        setCoords(null);
        setShowMap(false);
      }
    } else {
      setCoords(null);
      setShowMap(false);
    }
  }, [form.businessAddress]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  if (!user) {
    return <div className="p-8 text-center text-red-600 font-bold">Please log in to edit your profile.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile, { upsert: true });
        if (uploadError) {
          showToast('Failed to upload logo: ' + uploadError.message, 'error');
          setIsSubmitting(false);
          return;
        }
        logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      } catch (uploadErr: any) {
        showToast('Failed to upload logo: ' + (uploadErr.message || 'Unknown error'), 'error');
        setIsSubmitting(false);
        return;
      }
    }

    // Use backend API for profile updates
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          description: form.description,
          logo: logoUrl,
          phone: form.phone,
          business_address: form.businessAddress,
          website: form.website,
          category: form.category,
          owner_name: form.ownerName,
          subdomain: form.subdomain,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        showToast(`Backend server error (${response.status}). Please ensure the backend server is running on port 5000.`, 'error');
        setIsSubmitting(false);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        showToast(result.error || 'Failed to update profile', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!result.user) {
        showToast('User not found or no changes were made', 'error');
        setIsSubmitting(false);
        return;
      }

      // Update context/localStorage with the updated user data
      login(result.user);
      showToast('Profile updated successfully!', 'success');
      setIsSubmitting(false);
    } catch (fetchError: any) {
      console.error('Profile update error:', fetchError);
      if (fetchError.message?.includes('JSON')) {
        showToast('Backend server not responding. Please ensure the backend server is running.', 'error');
      } else {
        showToast('Network error. Please try again.', 'error');
      }
      setIsSubmitting(false);
    }
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

    if (!user?.email) {
      setPwError('User email not found. Please reload the page.');
      setPwSubmitting(false);
      return;
    }

    try {
      // 1. Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });

      if (signInError) {
        setPwError('Current password is incorrect.');
        setPwSubmitting(false);
        return;
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: pwForm.new,
      });

      if (updateError) {
        setPwError(updateError.message);
        setPwSubmitting(false);
        return;
      }

      setPwSuccess('Password changed successfully!');
      setPwForm({ current: '', new: '', confirm: '' });
      setShowPasswordModal(false);
    } catch (err: any) {
      setPwError('An unexpected error occurred.');
      console.error('Password change error:', err);
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Profile Information */}
              <div className="bg-white rounded-2xl shadow-2xl p-8">
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
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-gradient-to-r from-indigo-600 to-violet-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gradient-to-r from-indigo-600 to-violet-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                    <textarea name="description" value={form.description} onChange={handleChange} className="w-full px-3 py-2 border border-gradient-to-r from-indigo-600 to-violet-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100 resize-none" rows={5} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-violet-600 hover:to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg text-sm sm:text-base transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 shadow-md hover:shadow-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-white hover:bg-indigo-50 text-indigo-700 font-semibold py-3 px-4 rounded-lg text-sm sm:text-base transition-all duration-200 border-2 border-indigo-300 hover:border-indigo-500 shadow-sm hover:shadow-md"
                      onClick={() => setShowPasswordModal(true)}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Business Information */}
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-6 tracking-tight flex items-center">
                  <Briefcase className="mr-2" size={24} />
                  Business Information
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Owner Name
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={form.ownerName}
                      onChange={handleChange}
                      placeholder="Enter owner name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+383 XX XXX XXX"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Address
                    </label>
                    <input
                      type="text"
                      name="businessAddress"
                      value={form.businessAddress}
                      onChange={handleChange}
                      placeholder="Enter business address or paste Google Maps link"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                    />
                    {showMap && coords && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <iframe
                          width="100%"
                          height="300"
                          style={{ border: 0 }}
                          referrerPolicy="no-referrer-when-downgrade"
                          loading="lazy"
                          allowFullScreen
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(coords.lng) - 0.01},${parseFloat(coords.lat) - 0.01},${parseFloat(coords.lng) + 0.01},${parseFloat(coords.lat) + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                          title="Business Location"
                        />
                        <div className="text-xs text-gray-500 text-center py-1 bg-gray-50 border-t border-gray-200">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}&zoom=17`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            View larger map
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Subdomain
                    </label>
                    <div className="flex rounded-lg shadow-sm">
                      <input
                        type="text"
                        name="subdomain"
                        value={form.subdomain}
                        onChange={handleChange}
                        placeholder="your-business"
                        className="flex-1 min-w-0 px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                        pattern="[a-zA-Z0-9-]+"
                        title="Only letters, numbers, and hyphens are allowed"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        .appointly-ks.com
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Your public profile will be accessible at this subdomain.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                      <Briefcase className="w-4 h-4 mr-1" />
                      Category
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base bg-gray-100"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {showNotification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${notificationType === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
            }`}
        >
          {notificationType === 'success' ? (
            <>
              <CheckCircle className="h-5 w-5 animate-pulse" />
              <span>{notificationMessage}</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5" />
              <span>{notificationMessage}</span>
            </>
          )}
        </div>
      )}

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
