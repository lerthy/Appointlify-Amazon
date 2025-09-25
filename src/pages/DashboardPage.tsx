import React, { useEffect, useState } from 'react';
import Dashboard from '../components/business/Dashboard';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const DashboardPage: React.FC = () => {
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [paidUser, setPaidUser] = useState<{ payment: string } | null>(null);
  
  const isPaidUser = ['basic', 'pro', 'team'].includes(paidUser?.payment || '');

  useEffect(() => {
      const checkAuthAndPayment = async () => {
        if (!user || !user.id) {
          navigate('/login');
          return;
        }
        setIsLoading(true);
        const { data: paidUserData, error } = await supabase
          .from('users')
          .select('payment')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching payment status:', error);
        } else {
          setPaidUser(paidUserData);
        }
        setIsLoading(false);
      };
      checkAuthAndPayment();
    }, [user, navigate]);
  

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {isPaidUser && <Header />}
        <Dashboard />
      </div>
    </>
  );
};

export default DashboardPage;