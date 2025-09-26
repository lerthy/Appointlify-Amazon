import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Using real services from database

// Pages
import HomePage from './pages/HomePage';
import AppointmentPage from './pages/AppointmentPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Pricing from './pages/Pricing';
import PaymentForm from './pages/PaymentForm';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CancelAppointment from './components/customer/CancelAppointment';
import ProfilePage from './pages/ProfilePage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import AIChatbotDemoPage from './pages/AIChatbotDemoPage';
import AIChatbot from './components/shared/AIChatbot';

// Components

function Providers({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <AppProvider>{children}</AppProvider>;
}

function AppContent() {
  const location = useLocation();

  // Hide AI chat on login and signup, dashboard, pricing pages
  const shouldShowAIChat = !['/login', '/register', '/forgot-password', '/reset-password', '/dashboard', '/pricing'].includes(location.pathname);
  // Get plan from URL for payment form
  const plan = location.pathname.startsWith('/paymentForm-') ? location.pathname.split('-')[1] : null;

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book" element={<AppointmentPage />} />
        <Route path="/book/:businessId" element={<AppointmentPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path={`/paymentForm-${plan}`} element={<PaymentForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/cancel/:appointmentId" element={<CancelAppointment />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
        <Route path="/ai-demo" element={<AIChatbotDemoPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* AI Chatbot - Hidden on auth pages */}
      {shouldShowAIChat && <AIChatbot />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Providers>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </Providers>
    </AuthProvider>
  );
}

export default App;
