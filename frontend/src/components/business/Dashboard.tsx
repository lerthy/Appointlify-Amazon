import React, { useState, useEffect } from 'react';
import { Users, Calendar, BarChart2, Settings as SettingsIcon, Briefcase } from 'lucide-react';
import Tabs from '../ui/Tabs';
import AppointmentManagement from './AppointmentManagement';
import Analytics from './Analytics';
import Settings from './Settings';
import EmployeeManagement from './EmployeeManagement';
import ServiceManagement from './ServiceManagement';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const Dashboard: React.FC = () => {
  const { appointments, analytics, employees, services, refreshAppointments } = useApp();
  const { } = useAuth();
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
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={18} />, content: <AppointmentManagement /> },
    { id: 'employees', label: 'Employees', icon: <Users size={18} />, content: <EmployeeManagement /> },
    { id: 'services', label: 'Services', icon: <Briefcase size={18} />, content: <ServiceManagement /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} />, content: <Analytics /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} />, content: <Settings /> },
  ];

  

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
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="px-3 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center sm:flex-row flex-col sm:items-center">
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Total Appointments</dt>
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
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Today's Appointments</dt>
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
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Employees</dt>
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
                <div className="hidden sm:flex flex-shrink-0 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
                </div>
                <div className="sm:ml-5 w-full text-center sm:text-left">
                  <dl>
                    <dt className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Services</dt>
                    <dd className="flex items-baseline justify-center sm:justify-start">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{services.length}</div>
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

}

export default Dashboard;