import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import HomePage from './pages/HomePage';
import AppointmentPage from './pages/AppointmentPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CancelAppointment from './components/customer/CancelAppointment';
import ProfilePage from './pages/ProfilePage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';

function Providers({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <AppProvider>{children}</AppProvider>;
}

function App() {
  return (
    <AuthProvider>
      <Providers>
        <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<AppointmentPage />} />
            <Route path="/book/:businessId" element={<AppointmentPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/cancel/:appointmentId" element={<CancelAppointment />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
        </NotificationProvider>
      </Providers>
    </AuthProvider>
  );
}

export default App;
