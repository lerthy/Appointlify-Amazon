import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppointmentForm from '../components/customer/AppointmentForm';
import Container from '../components/ui/Container';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { ArrowLeft } from 'lucide-react';
// import { supabase } from '../utils/supabaseClient';
import { AppProvider } from '../context/AppContext';
import AuthPageTransition from '../components/shared/AuthPageTransition';
import { motion } from 'framer-motion';
import { extractCoordinates, isValidCoordinates } from '../utils/coordinates';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const AppointmentPage: React.FC = () => {
  const { subdomain } = useParams<{ subdomain?: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!subdomain) return;
    const fetchBusiness = async () => {
      setLoading(true);


      try {
        const res = await fetch(`/api/business/${subdomain}/info`);
        const json = await res.json();

        if (json.success && json.info) {

          setBusiness(json.info);
        } else {
          console.error('[AppointmentPage] Business not found or error:', json.error);
          setBusiness(null);
        }
      } catch (error) {
        console.error('[AppointmentPage] Error fetching business:', error);
        setBusiness(null);
      }

      setLoading(false);
    };
    fetchBusiness();
  }, [subdomain]);

  // Extract coordinates when business address changes
  useEffect(() => {
    if (business?.business_address) {
      const extracted = extractCoordinates(business.business_address);
      if (extracted && isValidCoordinates(extracted)) {
        setCoords(extracted);
        setShowMap(true);
      } else {
        setCoords(null);
        setShowMap(false);
      }
    } else {
      setCoords(null);
      setShowMap(false);
    }
  }, [business?.business_address]);

  if (!subdomain) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Business Not Found</h2>
          <p className="mb-6">Please select a business from the home page to book an appointment.</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center text-gray-500">Loading business info...</div>
      </Container>
    );
  }

  if (!business) {
    return (
      <Container maxWidth="md">
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Business Not Found</h2>
          <p className="mb-6">Please select a business from the home page to book an appointment.</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </Container>
    );
  }

  return (
    <AppProvider businessIdOverride={business.id}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
        <Header />
        <AuthPageTransition>
          <main className="flex-grow py-4 sm:py-8 px-4">
            <div className="max-w-6xl mx-auto">
              {/* Back Button */}
              <motion.button
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.3 } }}
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>Back</span>
              </motion.button>

              {/* Two Column Layout: Form on Left, Map on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Appointment Form */}
                <motion.div
                  className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8"
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.3 }}
                >
                  {/* Business Header inside form */}
                  <motion.div
                    className="flex flex-col items-center mb-6"
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
                      className="text-gray-600 mb-4 text-center text-sm"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }}
                    >
                      {business.description}
                    </motion.p>
                  </motion.div>
                  <AppointmentForm businessId={business.id} />
                </motion.div>

                {/* Right Column: Map */}
                {showMap && coords ? (
                  <motion.div
                    className="bg-white rounded-xl shadow-xl p-4 sm:p-6 overflow-hidden"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.4, duration: 0.5 } }}
                  >
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Location</h3>
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
                      <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 border-t border-gray-200">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}&zoom=17`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View larger map →
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8 flex items-center justify-center"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.4, duration: 0.5 } }}
                  >
                    <div className="text-center text-gray-400">
                      <p className="text-sm">No location available</p>
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