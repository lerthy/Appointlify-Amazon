import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, BarChart2, Settings as SettingsIcon, Briefcase, AlertCircle } from 'lucide-react';
import Tabs from '../ui/Tabs';
import Skeleton from '../ui/Skeleton';
import AppointmentManagement from './AppointmentManagement';
import Analytics from './Analytics';
import Settings from './Settings';
import EmployeeManagement from './EmployeeManagement';
import ServiceManagement from './ServiceManagement';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const Dashboard: React.FC = () => {
  const { appointments, analytics, employees, services, refreshAppointments, dashboardLoading } = useApp();
  const { } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('appointments');
  

  // Refresh appointments on tab change and set up polling for live updates
  useEffect(() => {
    // Always refresh when tab changes
    refreshAppointments();

    // Only poll when on appointments tab for live updates
    if (activeTab !== 'appointments') return;

    // Poll every 30 seconds for live updates
    const intervalId = setInterval(() => {
      refreshAppointments();
    }, 3000); // 3 seconds

    // Cleanup interval on unmount or tab change
    return () => clearInterval(intervalId);
  }, [activeTab, refreshAppointments]);

  // Always render the dashboard for all users

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const now = new Date();

  // Only count scheduled and confirmed appointments that are in the future or today but not yet passed
  const activeStatuses = ['scheduled', 'confirmed'];
  
  const todayAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date);
    const isToday = appointmentDate >= today && appointmentDate < tomorrow;
    const isFuture = appointmentDate >= now;
    const isActive = activeStatuses.includes(a.status);
    
    return isToday && isFuture && isActive;
  });

  // Calculate total appointments - only scheduled and confirmed, and in the future
  const totalAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date);
    return activeStatuses.includes(a.status) && appointmentDate >= now;
  }).length;

  const dashboardTabs = [
    { id: 'appointments', label: t('dashboard.tabs.appointments'), icon: <Calendar size={18} />, content: <AppointmentManagement /> },
    { id: 'employees', label: t('dashboard.tabs.employees'), icon: <Users size={18} />, content: <EmployeeManagement /> },
    { id: 'services', label: t('dashboard.tabs.services'), icon: <Briefcase size={18} />, content: <ServiceManagement /> },
    { id: 'analytics', label: t('dashboard.tabs.analytics'), icon: <BarChart2 size={18} />, content: <Analytics /> },
    { id: 'settings', label: t('dashboard.tabs.settings'), icon: <SettingsIcon size={18} />, content: <Settings /> },
  ];

  

  // Check if setup is incomplete
  const needsEmployees = employees.length === 0;
  const needsServices = services.length === 0;
  const setupIncomplete = needsEmployees || needsServices;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Setup Warning Banner */}
      {setupIncomplete && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  {t('dashboard.setupWarning.title')}
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p className="mb-2">
                    {t('dashboard.setupWarning.description')}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {needsEmployees && (
                      <li>
                        {t('dashboard.setupWarning.addEmployee')}{' '}
                        <button
                          onClick={() => setActiveTab('employees')}
                          className="font-medium underline hover:text-amber-900"
                        >
                          {t('dashboard.setupWarning.addEmployeeLink')}
                        </button>
                      </li>
                    )}
                    {needsServices && (
                      <li>
                        {t('dashboard.setupWarning.addService')}{' '}
                        <button
                          onClick={() => setActiveTab('services')}
                          className="font-medium underline hover:text-amber-900"
                        >
                          {t('dashboard.setupWarning.addServiceLink')}
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
      
      <main className="max-w-[1200px] mx-auto px-6 py-4 sm:py-6">
        {/* Stats Overview */}
        {dashboardLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-3 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center sm:flex-row flex-col sm:items-center">
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">{t('dashboard.stats.totalAppointments')}</dt>
                    <dd className="flex items-baseline justify-center sm:justify-start">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalAppointments}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-3 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center sm:flex-row flex-col sm:items-center">
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">{t('dashboard.stats.todayAppointments')}</dt>
                    <dd className="flex items-baseline justify-center sm:justify-start">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{todayAppointments.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-3 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center sm:flex-row flex-col sm:items-center">
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">{t('dashboard.tabs.employees')}</dt>
                    <dd className="flex items-baseline justify-center sm:justify-start">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{employees.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-3 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center sm:flex-row flex-col sm:items-center">
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-accent/20 to-accent/30 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">{t('dashboard.tabs.services')}</dt>
                    <dd className="flex items-baseline justify-center sm:justify-start">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{services.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        {/* Tabs for Different Sections */}
        {dashboardLoading ? (
          <div className="bg-white shadow rounded-xl p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
        <div className="bg-white shadow rounded-lg">
          <Tabs 
            tabs={dashboardTabs}
            defaultTab="appointments"
            onChange={setActiveTab}
          />
        </div>
        )}
      </main>
    </div>
  );

}

export default Dashboard;