import React, { useEffect, useMemo, useState } from 'react';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase } from '../../utils/supabaseClient';

type VerificationStatus = 'pending' | 'email_verified' | 'phone_verified' | 'documents_submitted' | 'verified' | 'rejected';

type Business = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  business_address?: string | null;
  website?: string | null;
  category?: string | null;
  owner_name?: string | null;
  verification_status?: VerificationStatus | null;
  verification_reason?: string | null;
  verified_at?: string | null;
};

type DocumentRecord = {
  id: string;
  user_id: string;
  doc_type: 'license' | 'owner_id' | 'utility_tax' | 'other';
  file_path: string;
  created_at: string;
};

const statuses: { id: VerificationStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'email_verified', label: 'Email Verified' },
  // Phone verification temporarily disabled; tab hidden
  { id: 'documents_submitted', label: 'Docs Submitted' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' }
];

const VerificationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VerificationStatus>('pending');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [docsByUser, setDocsByUser] = useState<Record<string, DocumentRecord[]>>({});
  const [decisionReason, setDecisionReason] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select(
        [
          'id',
          'name',
          'email',
          'phone',
          'business_address',
          'website',
          'category',
          'owner_name',
          'verification_status',
          'verification_reason',
          'verified_at'
        ].join(',')
      )
      .order('created_at', { ascending: false });
    if (!error && data) {
      setBusinesses(data as unknown as Business[]);
    }
    setLoading(false);
  };

  const loadDocsForUsers = async (userIds: string[]) => {
    if (!userIds.length) return;
    const { data, error } = await supabase
      .from('business_verification_documents')
      .select('id,user_id,doc_type,file_path,created_at')
      .in('user_id', userIds);
    if (!error && data) {
      const grouped: Record<string, DocumentRecord[]> = {};
      for (const row of data as unknown as DocumentRecord[]) {
        grouped[row.user_id] = grouped[row.user_id] || [];
        grouped[row.user_id].push(row);
      }
      setDocsByUser(grouped);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const ids = filteredBusinesses.map(b => b.id);
    loadDocsForUsers(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, businesses.length]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => (b.verification_status || 'pending') === activeTab);
  }, [businesses, activeTab]);

  const approve = async (userId: string) => {
    try {
      setUpdating(userId);
      const reason = decisionReason[userId] || '';
      const { error } = await supabase
        .from('users')
        .update({
          verification_status: 'verified',
          verification_reason: reason || null,
          verified_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      await refresh();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const reject = async (userId: string) => {
    try {
      setUpdating(userId);
      const reason = decisionReason[userId] || 'Insufficient documents';
      const { error } = await supabase
        .from('users')
        .update({
          verification_status: 'rejected',
          verification_reason: reason || 'Insufficient documents',
          verified_at: null
        })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      await refresh();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const StatusBadge: React.FC<{ status: VerificationStatus | null | undefined }> = ({ status }) => {
    const s = (status || 'pending') as VerificationStatus;
    const map: Record<VerificationStatus, string> = {
      pending: 'bg-gray-100 text-gray-800',
      email_verified: 'bg-blue-100 text-blue-800',
      phone_verified: 'bg-indigo-100 text-indigo-800',
      documents_submitted: 'bg-amber-100 text-amber-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${map[s]}`}>{s.replace('_', ' ')}</span>;
  };

  const tabs = statuses.map(s => ({ id: s.id, label: s.label, content: null }));

  return (
    <div className="p-4">
      <Tabs tabs={tabs as any} defaultTab={activeTab} onChange={(id: string) => setActiveTab(id as VerificationStatus)} />
      <div className="mt-4 grid grid-cols-1 gap-4">
        {loading && <div className="text-sm text-gray-600">Loading...</div>}
        {!loading && filteredBusinesses.length === 0 && (
          <div className="text-sm text-gray-600">No businesses in this stage.</div>
        )}
        {!loading && filteredBusinesses.map(b => (
          <Card key={b.id}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">{b.name}</h3>
                  {b.verification_status === 'verified' && (
                    <span className="inline-flex items-center text-green-700 text-xs">✔ Verified</span>
                  )}
                </div>
                <div className="text-xs text-gray-600">{b.email}{b.phone ? ` • ${b.phone}` : ''}</div>
                <div className="text-xs text-gray-600">{b.category || '—'} • {b.website || '—'}</div>
                <div className="mt-1">
                  <StatusBadge status={b.verification_status} />
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <div className="text-xs text-gray-700 font-medium mb-1">Decision Note</div>
                <input
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded"
                  placeholder="Optional note for approve/reject"
                  value={decisionReason[b.id] || ''}
                  onChange={(e) => setDecisionReason(prev => ({ ...prev, [b.id]: e.target.value }))}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  {b.verification_status !== 'rejected' && (
                    <Button variant="secondary" disabled={updating === b.id} onClick={() => reject(b.id)}>Reject</Button>
                  )}
                  {b.verification_status !== 'verified' && (
                    <Button disabled={updating === b.id} onClick={() => approve(b.id)}>
                      {updating === b.id ? 'Updating...' : 'Approve'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Submitted Documents</div>
              <div className="space-y-1">
                {(docsByUser[b.id] || []).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between text-xs text-gray-700">
                    <span className="capitalize">{doc.doc_type.replace('_', ' ')}</span>
                    <a
                      className="text-indigo-600 hover:underline"
                      href={supabase.storage.from('business_documents').getPublicUrl(doc.file_path).data.publicUrl}
                      target="_blank" rel="noreferrer"
                    >
                      View
                    </a>
                  </div>
                ))}
                {(docsByUser[b.id] || []).length === 0 && (
                  <div className="text-xs text-gray-500">No documents found.</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VerificationDashboard;


