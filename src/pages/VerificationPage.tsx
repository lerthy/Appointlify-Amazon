import React, { useEffect, useState } from 'react';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabaseClient';

type VerificationStatus = 'pending' | 'email_verified' | 'phone_verified' | 'documents_submitted' | 'verified' | 'rejected';

const VerificationPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [reason, setReason] = useState<string>('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [ownerIdFile, setOwnerIdFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    business_address: '',
    website: '',
    category: '',
    owner_name: ''
  });

  useEffect(() => {
    if (!user || !user.id) {
      navigate('/login');
      return;
    }
    if (user.verification_status === 'verified') {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('users')
        .select('verification_status, verification_reason, phone, business_address, website, category, owner_name')
        .eq('id', user.id)
        .single();
      if (data) {
        setStatus((data.verification_status || 'pending') as VerificationStatus);
        setReason(data.verification_reason || '');
        setForm({
          phone: data.phone || '',
          business_address: data.business_address || '',
          website: data.website || '',
          category: data.category || '',
          owner_name: data.owner_name || ''
        });
        if (data.verification_status === 'verified') {
          navigate('/dashboard');
          return;
        }
      }
    };
    load();
  }, [user?.id]);

  const uploadOne = async (file: File, type: string) => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('business_documents').upload(path, file);
    if (uploadError) throw uploadError;
    const { error: insertError } = await supabase
      .from('business_verification_documents')
      .insert({ user_id: user.id, doc_type: type, file_path: path });
    if (insertError) throw insertError;
  };

  const onSubmitDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.business_address || !form.category || !form.owner_name) {
      alert('Please fill phone, business address, category and owner name.');
      return;
    }
    if (!licenseFile || !ownerIdFile || !addressProofFile) {
      alert('Please attach Business License, Owner ID, and Address Proof (invoice/utility).');
      return;
    }
    setIsUploading(true);
    try {
      // Save business details on user record
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: form.phone,
          business_address: form.business_address,
          website: form.website || null,
          category: form.category,
          owner_name: form.owner_name
        })
        .eq('id', user.id);
      if (updateError) throw updateError;

      if (licenseFile) await uploadOne(licenseFile, 'license');
      if (ownerIdFile) await uploadOne(ownerIdFile, 'owner_id');
      if (addressProofFile) await uploadOne(addressProofFile, 'utility_tax');
      await supabase.from('users').update({ verification_status: 'documents_submitted' }).eq('id', user.id);
      // Refresh local auth user so header/banner updates immediately
      login({ ...user, verification_status: 'documents_submitted' });
      alert('Documents submitted. We will review shortly.');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to upload documents.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Verification</h1>
        <p className="text-sm text-gray-600 mb-6">Complete the steps below to verify your business.</p>

        <div className="bg-white rounded-lg shadow-none overflow-hidden">
          <div className="space-y-4 ">
            <div>
              <div className="text-sm font-semibold text-gray-900">Current Status</div>
              <div className="text-sm text-gray-700">{status.replace('_', ' ')}</div>
              {reason && (
                <div className="text-xs text-red-600 mt-1">Reason: {reason}</div>
              )}
            </div>

            <form className="space-y-3" onSubmit={onSubmitDocs}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => setForm(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Business Address</label>
                  <input
                    type="text"
                    value={form.business_address}
                    onChange={(e) => setForm(prev => ({ ...prev, business_address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Beauty/Hair">Beauty/Hair</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Website (optional)</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Business License/Registration</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Owner ID or Passport</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setOwnerIdFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Business Address Proof (invoice/utility)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setAddressProofFile(e.target.files?.[0] || null)} />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Submit Documents'}</Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerificationPage;


