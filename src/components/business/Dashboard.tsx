import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, BarChart2, Settings as SettingsIcon, Wrench, Briefcase, Lock } from 'lucide-react';
import Tabs from '../ui/Tabs';
import AppointmentManagement from './AppointmentManagement';
import Analytics from './Analytics';
import Settings from './Settings';
import { supabase } from '../../utils/supabaseClient';
import EmployeeManagement from './EmployeeManagement';
import ServiceManagement from './ServiceManagement';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { fixBusinessSettings } from '../../utils/fixBusinessSettings';

const Dashboard: React.FC = () => {
  const { appointments, analytics, employees, services } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [isFixing, setIsFixing] = useState(false);
  const [paidUser, setPaidUser] = useState<{ payment: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isPaidUser) {
    return (
      <div className="relative min-h-screen flex overflow-hidden z-1000">
        <div className="flex-1 bg-gradient-to-br from-indigo-900 via-gray-900 to-purple-900 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
          <div className="relative flex flex-col items-center">
            <Lock className="h-48 w-48 text-indigo-300 animate-pulse-slow drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))' }} />
            <p className="mt-4 text-indigo-200 text-lg font-medium animate-fade-in">Unlock Premium Features</p>
          </div>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent opacity-80"></div>
          <div className="relative text-center max-w-lg p-8">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight animate-slide-up">Unlock the Full Experience</h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed animate-slide-up delay-100">Upgrade to a premium plan to access exclusive features, advanced tools, and a seamless dashboard experience tailored just for you.</p>
            <button onClick={() => navigate('/pricing')} className="group relative px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"></span>
              Explore Premium Plans
            </button>
            <p className="mt-6 text-sm text-gray-500 animate-slide-up delay-200">Not sure yet? <a href="/features" className="text-indigo-600 hover:text-indigo-800 font-medium underline transition">Learn more about premium features</a></p>
          </div>
        </div>
        <style>{`
          @keyframes pulse-slow { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
          .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 1s ease-in-out; }
          @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slide-up 0.8s ease-out; }
          .delay-100 { animation-delay: 0.1s; }
          .delay-200 { animation-delay: 0.2s; }
        `}</style>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date);
    return appointmentDate >= today && appointmentDate < tomorrow;
  });

  const dashboardTabs = [
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={18} />, content: <AppointmentManagement /> },
    { id: 'employees', label: 'Employees', icon: <Users size={18} />, content: <EmployeeManagement /> },
    { id: 'services', label: 'Services', icon: <Briefcase size={18} />, content: <ServiceManagement /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} />, content: <Analytics /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} />, content: <Settings /> },
  ];

  const handleFixSetupData = async () => {
    setIsFixing(true);
    try {
      await fixBusinessSettings();
      alert('Setup data fix completed! Business settings, services, and employees have been created. Please refresh the page.');
    } catch (error) {
      console.error('Error fixing setup data:', error);
      alert('Error fixing setup data. Check console for details.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Internal header commented out */}
      {/* <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Business Dashboard</h1>
            <button
              onClick={handleFixSetupData}
              disabled={isFixing}
              className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              <Wrench className="h-4 w-4 mr-2" />
              {isFixing ? 'Fixing...' : 'Fix Setup Data'}
            </button>
          </div>
        </div>
      </header> */}
      
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-6 sm:mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Total Appointments</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{appointments.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Today's Appointments</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{todayAppointments.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Employees</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{employees.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Services</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{services.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <BarChart2 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Avg. Wait Time</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.averageWaitTime} min</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Tabs for Different Sections */}
        <div className="bg-white shadow rounded-lg">
          <Tabs 
            tabs={dashboardTabs}
            defaultTab="appointments"
            onChange={setActiveTab}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;