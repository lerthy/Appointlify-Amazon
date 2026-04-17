import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppointmentForm from '../components/customer/AppointmentForm';
import Container from '../components/ui/Container';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { AppProvider } from '../context/AppContext';
import AuthPageTransition from '../components/shared/AuthPageTransition';
import { motion } from 'framer-motion';
import { getMainDomainUrl } from '../utils/subdomain';
import {
  extractCoordinates,
  isValidCoordinates,
  isShortGoogleMapsUrl,
  resolveShortMapsUrlToCoordinates,
} from '../utils/coordinates';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

interface AppointmentPageProps {
  businessIdOverride?: string;
}

const AppointmentPage: React.FC<AppointmentPageProps> = ({ businessIdOverride }) => {
  const { t } = useTranslation();
  const { businessId: urlBusinessId } = useParams<{ businessId?: string }>();
  const businessId = businessIdOverride || urlBusinessId;
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [eligibility, setEligibility] = useState<{
    isEligible: boolean;
    hasServices: boolean;
    hasEmployees: boolean;
    hasSettings: boolean;
  }>({
    isEligible: true, // Default to true until checked
    hasServices: true,
    hasEmployees: true,
    hasSettings: true,
  });

  useEffect(() => {
    if (!businessId) return;
    const fetchBusiness = async () => {
      setLoading(true);
      console.log('[AppointmentPage] Fetching business:', businessId);
      
      try {
        // Fetch business info and eligibility requirements in parallel
        const [bizResult, servicesResult, employeesResult, settingsResult] = await Promise.all([
          supabase.from('users').select('id, name, description, logo, business_address').eq('id', businessId).single(),
          supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
          supabase.from('business_settings').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        ]);
        
        if (bizResult.error) {
          console.error('[AppointmentPage] Error fetching business:', bizResult.error);
          setBusiness(null);
        } else if (bizResult.data) {
          console.log('[AppointmentPage] Business found:', bizResult.data);
          setBusiness(bizResult.data);
          
          const hasServices = (servicesResult.count ?? 0) > 0;
          const hasEmployees = (employeesResult.count ?? 0) > 0;
          const hasSettings = (settingsResult.count ?? 0) > 0;
          
          setEligibility({
            isEligible: hasServices && hasEmployees && hasSettings,
            hasServices,
            hasEmployees,
            hasSettings,
          });
        } else {
          setBusiness(null);
        }
      } catch (err) {
        console.error('[AppointmentPage] Unexpected error:', err);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [businessId]);

  // Extract coordinates when business address changes (incl. short maps.app.goo.gl)
  useEffect(() => {
    const addr = business?.business_address?.trim() ?? '';
    if (!addr) {
      setCoords(null);
      setShowMap(false);
      return;
    }

    const extracted = extractCoordinates(addr);
    if (extracted && isValidCoordinates(extracted)) {
      setCoords(extracted);
      setShowMap(true);
      return;
    }

    if (!isShortGoogleMapsUrl(addr)) {
      setCoords(null);
      setShowMap(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const coords = await resolveShortMapsUrlToCoordinates(addr);
      if (cancelled) return;
      if (coords) {
        setCoords(coords);
        setShowMap(true);
      } else {
        setCoords(null);
        setShowMap(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [business?.business_address]);

  if (!businessId) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('appointmentPage.businessNotFound')}</h2>
          <p className="mb-6">{t('appointmentPage.selectBusiness')}</p>
          <button
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light"
            onClick={() => navigate('/')}
          >
            {t('appointmentPage.backToHome')}
          </button>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center text-gray-500">{t('appointmentPage.loading')}</div>
      </Container>
    );
  }

  if (!business) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('appointmentPage.businessNotFound')}</h2>
          <p className="mb-6">{t('appointmentPage.selectBusiness')}</p>
          <button
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light"
            onClick={() => navigate('/')}
          >
            {t('appointmentPage.backToHome')}
          </button>
        </div>
      </Container>
    );
  }

  return (
    <AppProvider businessIdOverride={businessId}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background">
        <Header />
        <AuthPageTransition>
          <main className="flex-grow py-4 sm:py-8 px-4">
            <div className="max-w-6xl mx-auto">
              {/* Two columns when map is shown; single column otherwise */}
              <div
                className={
                  showMap && coords && eligibility.isEligible
                    ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                    : 'mx-auto w-full max-w-2xl flex flex-col gap-6'
                }
              >
                {/* Left Column: Appointment Form */}
                <motion.div
                  className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-4 sm:p-6 md:p-8 relative"
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    type="button"
                    onClick={() => {
                      if (businessIdOverride) {
                        window.location.href = getMainDomainUrl('/');
                      } else {
                        navigate('/');
                      }
                    }}
                    className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 p-2 rounded-lg text-navy-800 hover:text-primary hover:bg-primary/[0.05] transition-colors duration-200"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.3 } }}
                    aria-label={t('appointmentPage.backToHome')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>

                  {/* Business Header inside form */}
                  <motion.div
                    className="flex flex-col items-center mb-6 pt-2"
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                  >
                    {business.logo && (
                      <motion.img
                        src={business.logo}
                        alt={business.name}
                        className="w-16 h-16 object-contain rounded-full border mb-2 shadow-md bg-white"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5 } }}
                      />
                    )}
                    <motion.h1
                      className="text-xl font-bold mb-1 text-center"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.5 } }}
                    >
                      {business.name}
                    </motion.h1>
                    <motion.p
                      className="text-muted mb-4 text-center text-sm"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }}
                    >
                      {business.description}
                    </motion.p>
                  </motion.div>

                  {eligibility.isEligible ? (
                    <AppointmentForm businessId={business.id} business={business} />
                  ) : (
                    <motion.div 
                      className="p-6 bg-amber-50 rounded-xl border border-amber-200 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-amber-900 mb-2">
                        Appointments Not Available Yet
                      </h3>
                      <p className="text-amber-800 text-sm mb-6">
                        This business doesn't meet the requirements for an appointment yet. 
                        The business owner needs to complete their profile setup.
                      </p>
                      
                      <div className="space-y-3 text-left max-w-xs mx-auto">
                        <div className="flex items-center text-sm">
                          {eligibility.hasServices ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={eligibility.hasServices ? 'text-green-700' : 'text-red-700 font-medium'}>
                            Added services
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          {eligibility.hasEmployees ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={eligibility.hasEmployees ? 'text-green-700' : 'text-red-700 font-medium'}>
                            Added employees
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          {eligibility.hasSettings ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={eligibility.hasSettings ? 'text-green-700' : 'text-red-700 font-medium'}>
                            Configured working hours
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Right Column: Map */}
                {showMap && coords && eligibility.isEligible && (
                  <motion.div
                    className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-4 sm:p-6 overflow-hidden max-h-fit self-center"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.4, duration: 0.5 } }}
                  >
                    <h3 className="text-lg font-semibold mb-3 text-navy-900">Location</h3>
                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <iframe
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        referrerPolicy="no-referrer-when-downgrade"
                        loading="lazy"
                        allowFullScreen
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(coords.lng) - 0.01},${parseFloat(coords.lat) - 0.01},${parseFloat(coords.lng) + 0.01},${parseFloat(coords.lat) + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                        title="Business Location"
                      />
                      <div className="text-xs text-muted text-center py-2 bg-surface border-t border-gray-100">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}&zoom=17`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-light font-medium"
                        >
                          View larger map →
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </main>
        </AuthPageTransition>
        <Footer />
      </div>
    </AppProvider>
  );
};

export default AppointmentPage;