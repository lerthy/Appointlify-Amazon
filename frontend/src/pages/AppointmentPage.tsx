import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppointmentForm from '../components/customer/AppointmentForm';
import Container from '../components/ui/Container';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useApp } from '../context/AppContext';
import { Plus, Calendar, User, MessageSquare, Dumbbell, List, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { AppProvider } from '../context/AppContext';
import AuthPageTransition from '../components/shared/AuthPageTransition';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import { CardHeader } from '../components/ui/Card';

const iconMap: Record<string, React.ReactNode> = {
  default: <List size={32} />, // fallback icon
  plus: <Plus size={32} />,
  calendar: <Calendar size={32} />,
  user: <User size={32} />,
  message: <MessageSquare size={32} />,
  dumbbell: <Dumbbell size={32} />,
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const AppointmentPage: React.FC = () => {
  const { businessId } = useParams<{ businessId?: string }>();
  const { businessSettings } = useApp();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    const fetchBusiness = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, description, logo')
        .eq('id', businessId)
        .single();
      if (!error && data) {
        setBusiness(data);
      }
      setLoading(false);
    };
    fetchBusiness();
  }, [businessId]);

  if (!businessId) {
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
    <AppProvider businessIdOverride={businessId}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
        <Header />
        <AuthPageTransition>
          <main className="flex-grow py-8 flex items-center justify-center">
            <motion.div
              className="w-full max-w-xl bg-white rounded-xl shadow-xl p-6 md:p-8 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3, ease: 'easeIn' } }}
            >
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="position-absolute self-start mb-4 w-contain"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button> */}
              <motion.div
                className="flex flex-col items-center mb-4 w-full"
                variants={fadeUp}
                initial="initial"
                animate="animate"
              >
                <CardHeader className="absolute self-start mb-4 border-none">
                  <button
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center text-gradient-to-r from-indigo-600 to-violet-600 hover:text-indigo-700 transition-colors duration-200"
                      type="button"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </CardHeader>
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
                  className="text-gray-600 mb-2 text-center text-sm"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }}
                >
                  {business.description}
                </motion.p>
              </motion.div>
              <motion.div
                className="w-full"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.3 }}
              >
                <AppointmentForm businessId={business.id} />
              </motion.div>
            </motion.div>
          </main>
        </AuthPageTransition>
        <Footer />
      </div>
    </AppProvider>
  );
};

export default AppointmentPage;