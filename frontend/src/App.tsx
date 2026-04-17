import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { getSubdomain, getMainDomainUrl } from './utils/subdomain';

// Pages
import HomePage from './pages/HomePage';
import AppointmentPage from './pages/AppointmentPage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CancelAppointment from './components/customer/CancelAppointment';
import ProfilePage from './pages/ProfilePage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import AIChatbotDemoPage from './pages/AIChatbotDemoPage';
import AIChatbot from './components/shared/AIChatbot';
import BusinessAIChatPage from './pages/BusinessAIChatPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import AboutUsPage from './pages/AboutUsPage';
import ServicesPage from './pages/ServicesPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ConfirmAppointmentPage from './pages/ConfirmAppointmentPage';
import GoogleOAuthCallbackPage from './pages/GoogleOAuthCallbackPage';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Context for subdomain-specific data
const SubdomainContext = createContext<{
  resolvedBusinessId: string | null;
  isChecking: boolean;
}>({
  resolvedBusinessId: null,
  isChecking: true,
});

export const useSubdomain = () => useContext(SubdomainContext);

function SubdomainProvider({ children }: { children: React.ReactNode }) {
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const subdomain = getSubdomain();

    if (!subdomain) {
      setIsChecking(false);
      return;
    }

    // Resolve subdomain → business ID once
    console.log(`[Subdomain] Detected "${subdomain}", resolving...`);
    fetch(`${API_BASE}/api/resolve-subdomain/${subdomain}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.business?.id) {
          console.log(`[Subdomain] Resolved to business ID: ${data.business.id}`);
          setResolvedBusinessId(data.business.id);
        } else {
          console.warn(`[Subdomain] Resolution failed for "${subdomain}":`, data.error);
          // Redirection to main platform if subdomain is invalid/doesnt exist
          window.location.replace(getMainDomainUrl('/'));
        }
      })
      .catch(err => {
        console.error('[Subdomain] Error resolving subdomain:', err);
        // Fallback to main domain on network error during resolution
        window.location.replace(getMainDomainUrl('/'));
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, []); // Run once on app mount

  return (
    <SubdomainContext.Provider value={{ resolvedBusinessId, isChecking }}>
      {children}
    </SubdomainContext.Provider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  return <>{children}</>;
}

function AppProviderWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const enableRealtime = location.pathname === '/dashboard';
  return <AppProvider enableRealtime={enableRealtime}>{children}</AppProvider>;
}

function AppContent() {
  const location = useLocation();
  const { resolvedBusinessId, isChecking } = useSubdomain();

  // Enforce root path for subdomains: subdomain.domain.com/anything -> subdomain.domain.com/
  useEffect(() => {
    const subdomain = getSubdomain();
    if (subdomain && location.pathname !== '/') {
      console.log(`[Subdomain] Path "${location.pathname}" not allowed on subdomain. Redirecting to root.`);
      window.location.replace('/');
    }
  }, [location.pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading business page...</p>
        </div>
      </div>
    );
  }

  // Hide AI chat on login and signup, and dashboard pages
  const shouldShowAIChat = !['/login', '/register', '/forgot-password', '/reset-password', '/dashboard', '/verify-email', '/confirm-appointment'].includes(location.pathname);

  return (
    <>
      <Routes>
        {/* If we have a resolved business from the subdomain, the root route renders the booking page */}
        <Route 
          path="/" 
          element={resolvedBusinessId ? <AppointmentPage businessIdOverride={resolvedBusinessId} /> : <HomePage />} 
        />
        
        {/* Standard routes */}
        <Route path="/book" element={<AppointmentPage />} />
        <Route path="/book/:businessId" element={<AppointmentPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/confirm-appointment" element={<ConfirmAppointmentPage />} />
        <Route path="/auth/google" element={<GoogleOAuthCallbackPage />} />

        <Route path="/cancel/:appointmentId" element={<CancelAppointment />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
        <Route path="/ai-demo" element={<AIChatbotDemoPage />} />
        <Route path="/ai-business-chat" element={<BusinessAIChatPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
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
            <SubdomainProvider>
              <AppProviderWrapper>
                <AppContent />
              </AppProviderWrapper>
            </SubdomainProvider>
          </Router>
        </NotificationProvider>
      </Providers>
    </AuthProvider>
  );
}

export default App;
