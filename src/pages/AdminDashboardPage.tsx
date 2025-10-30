import React, { useEffect } from 'react';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import VerificationDashboard from '../components/admin/VerificationDashboard';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.id) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8 w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Verification</h1>
            <p className="text-sm text-gray-600">Review and approve/reject business verification.</p>
          </div>
          <div className="bg-white shadow rounded-lg">
            <VerificationDashboard />
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboardPage;


