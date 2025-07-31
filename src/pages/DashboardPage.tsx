import React from 'react';
import Dashboard from '../components/business/Dashboard';
import Header from '../components/shared/Header';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Dashboard />
    </div>
  );
};

export default DashboardPage;