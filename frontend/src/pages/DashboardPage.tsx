import React, { useEffect } from 'react';
import Dashboard from '../components/business/Dashboard';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  
  const { user } = useAuth();
  const navigate = useNavigate();
  

  useEffect(() => {
      const checkAuth = async () => {
        if (!user || !user.id) {
          navigate('/login');
          return;
        }
        
      };
      checkAuth();
    }, [user, navigate]);
  

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Header />
        <Dashboard />
      </div>
    </>
  );
};

export default DashboardPage;