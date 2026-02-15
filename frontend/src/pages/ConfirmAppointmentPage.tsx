import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader, Calendar, Clock, User, Briefcase, MapPin, Phone, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { formatDate, formatTime } from '../utils/formatters';

interface AppointmentDetails {
  id: string;
  confirmationStatus: string;
  isExpired: boolean;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  duration: number;
  service: {
    name: string;
    price: number;
    duration: number;
    description?: string;
  } | null;
  business: {
    name: string;
    phone?: string;
    email?: string;
    business_address?: string;
    logo?: string;
  } | null;
  employee: {
    name: string;
    role: string;
  } | null;
}

const ConfirmAppointmentPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error' | 'already-confirmed'>('loading');
  const [message, setMessage] = useState('');
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token provided');
      return;
    }

    // Prevent double execution in React Strict Mode
    if (hasRunRef.current) {
      console.log('[ConfirmAppointment] Already ran, skipping...');
      return;
    }
    hasRunRef.current = true;

    const autoConfirmAppointment = async () => {
      try {
        // Check if we're in development mode without local server
        const isDevelopment = import.meta.env.DEV;
        const isLocalhost = window.location.hostname === 'localhost';
        const port = window.location.port;
        
        let endpoint: string;
        
        // Try Express server first if on localhost with a port (but not 8888 which is Netlify dev)
        if (isDevelopment && isLocalhost && port && port !== '8888') {
          // Use Express server endpoint for local dev (will be proxied to backend)
          endpoint = `/api/confirm-appointment?token=${token}`;
          console.log('[ConfirmAppointment] Using Express endpoint:', endpoint);
        } else {
          // Use Netlify function (production or netlify dev)
          endpoint = `/.netlify/functions/confirm-appointment?token=${token}`;
          console.log('[ConfirmAppointment] Using Netlify function:', endpoint);
        }
        
        // Show confirming state
        setStatus('confirming');
        
        // Auto-confirm via GET request
        console.log('[ConfirmAppointment] Fetching:', endpoint);
        const confirmResponse = await fetch(endpoint);
        console.log('[ConfirmAppointment] Response status:', confirmResponse.status, confirmResponse.statusText);
        console.log('[ConfirmAppointment] Response URL:', confirmResponse.url);
        console.log('[ConfirmAppointment] Response headers:', Object.fromEntries(confirmResponse.headers.entries()));
        
        // Check content-type before parsing
        const contentType = confirmResponse.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        console.log('[ConfirmAppointment] Content-Type:', contentType, 'isJson:', isJson);
        
        // Check if response is ok before trying to parse JSON
        if (!confirmResponse.ok) {
          console.warn('[ConfirmAppointment] First attempt failed:', confirmResponse.status, confirmResponse.statusText);
          // If 404, try the alternative endpoint
          if (confirmResponse.status === 404 && isDevelopment && isLocalhost && port && port !== '8888') {
            // Try Netlify function as fallback (though this won't work in local dev without netlify dev)
            const fallbackEndpoint = `/.netlify/functions/confirm-appointment?token=${token}`;
            console.log('[ConfirmAppointment] Trying fallback endpoint:', fallbackEndpoint);
            const fallbackResponse = await fetch(fallbackEndpoint);
            console.log('[ConfirmAppointment] Fallback response status:', fallbackResponse.status);
            const fallbackContentType = fallbackResponse.headers.get('content-type');
            const fallbackIsJson = fallbackContentType && fallbackContentType.includes('application/json');
            
            if (fallbackResponse.ok && fallbackIsJson) {
              try {
                const fallbackData = await fallbackResponse.json();
                return handleConfirmResponse(fallbackResponse, fallbackData);
              } catch (err) {
                console.error('Error parsing fallback response:', err);
              }
            }
          }
          
          // If still failing, try to get error message
          let errorMessage = 'Confirmation endpoint not found. Please check if the server is running.';
          if (isJson) {
            try {
              const errorData = await confirmResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch (err) {
              console.error('Error parsing error response:', err);
              errorMessage = confirmResponse.statusText || errorMessage;
            }
          } else {
            // If it's HTML (404 page), use a more helpful message
            errorMessage = `Endpoint not found (${confirmResponse.status}). The confirmation service may not be available. Please contact support.`;
          }
          
          setStatus('error');
          setMessage(errorMessage);
          return;
        }
        
        // Parse JSON only if content-type is JSON
        if (!isJson) {
          setStatus('error');
          setMessage('Invalid response from server. Please try again or contact support.');
          return;
        }
        
        const confirmData = await confirmResponse.json();
        
        handleConfirmResponse(confirmResponse, confirmData);
      } catch (error) {
        console.error('Error confirming appointment:', error);
        setStatus('error');
        setMessage('An error occurred during confirmation. Please try again or contact support.');
      }
    };
    
    const handleConfirmResponse = async (response: Response, data: any) => {

      if (response.ok && data.success) {
        // Check if already confirmed
        if (data.alreadyConfirmed) {
          setStatus('already-confirmed');
          setMessage('This appointment has already been confirmed');
          // Fetch full appointment details for display
          await fetchFullAppointmentDetails();
        } else {
          // Successfully confirmed, now fetch full appointment details
          setStatus('success');
          setMessage(data.message || 'Appointment confirmed successfully!');
          await fetchFullAppointmentDetails();
        }
      } else {
        // If confirmation failed, try to fetch details to show what went wrong
        setStatus('error');
        setMessage(data.error || 'Confirmation failed. Please try again or contact support.');
        
        // Try to fetch appointment details to check if it's expired
        try {
          await fetchFullAppointmentDetails();
        } catch (err) {
          // Ignore errors when fetching details after confirmation failure
        }
      }
    };

    const fetchFullAppointmentDetails = async () => {
      try {
        // Check if we're in development mode without local server
        const isDevelopment = import.meta.env.DEV;
        const isLocalhost = window.location.hostname === 'localhost';
        const port = window.location.port;
        
        let endpoint: string;
        
        // Try Express server first if on localhost with a port (but not 8888 which is Netlify dev)
        if (isDevelopment && isLocalhost && port && port !== '8888') {
          // Use Express server endpoint for local dev
          endpoint = '/api/confirm-appointment';
        } else {
          // Use Netlify function (production or netlify dev)
          endpoint = '/.netlify/functions/confirm-appointment';
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        // Check content-type before parsing
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        // Handle 404 by trying alternative endpoint
        if (!response.ok && response.status === 404 && isDevelopment && isLocalhost && port && port !== '8888') {
          // Try Netlify function as fallback
          const fallbackEndpoint = '/.netlify/functions/confirm-appointment';
          const fallbackResponse = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          
          const fallbackContentType = fallbackResponse.headers.get('content-type');
          const fallbackIsJson = fallbackContentType && fallbackContentType.includes('application/json');
          
          if (fallbackResponse.ok && fallbackIsJson) {
            try {
              const fallbackData = await fallbackResponse.json();
              return handleAppointmentDetails(fallbackData);
            } catch (err) {
              console.error('Error parsing fallback appointment details:', err);
            }
          }
        }
        
        if (!response.ok) {
          console.error('Failed to fetch appointment details:', response.status, response.statusText);
          return;
        }
        
        if (!isJson) {
          console.error('Invalid content-type for appointment details:', contentType);
          return;
        }
        
        const data = await response.json();
        handleAppointmentDetails(data);
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        // Don't change status if we already have one set
      }
    };
    
    const handleAppointmentDetails = (data: any) => {
      if (data.success) {
        setAppointment(data.appointment);
        
        // Update status based on appointment state if needed
        setStatus(prevStatus => {
          if (data.appointment.confirmationStatus === 'confirmed' && prevStatus !== 'success' && prevStatus !== 'already-confirmed') {
            return 'already-confirmed';
          } else if (data.appointment.isExpired && prevStatus !== 'error') {
            return 'error';
          }
          return prevStatus;
        });
        
        if (data.appointment.confirmationStatus === 'confirmed') {
          setMessage('This appointment has already been confirmed');
        } else if (data.appointment.isExpired) {
          setMessage('This confirmation link has expired. Please contact the business to reschedule.');
        }
      }
    };

    autoConfirmAppointment();
  }, [token]);


  const renderAppointmentDetails = () => {
    if (!appointment) return null;

    const appointmentDate = new Date(appointment.date);

    return (
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 mb-6">
        <div className="flex flex-col items-center justify-center mb-6 gap-4">
          {appointment.business?.logo ? (
            <img
              src={appointment.business.logo}
              alt={appointment.business.name}
              className="w-16 h-16 rounded-full object-cover border-4 border-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-2xl font-bold">
              {(appointment.business?.name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{appointment.business?.name || 'Business'}</h2>
            <p className="text-gray-600">{appointment.service?.name || 'Appointment'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center p-4 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(appointmentDate)}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-primary/10 rounded-lg">
            <Clock className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(appointmentDate)} ({appointment.duration} minutes)
              </p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-primary/10 rounded-lg">
            <Briefcase className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Service</p>
              <p className="text-lg font-semibold text-gray-900">{appointment.service?.name || 'Service'}</p>
              {appointment.service?.price != null && (
                <p className="text-sm text-green-600 font-semibold">${appointment.service.price}</p>
              )}
            </div>
          </div>

          {appointment.employee && (
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <User className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Professional</p>
                <p className="text-lg font-semibold text-gray-900">{appointment.employee.name}</p>
                <p className="text-sm text-gray-600">{appointment.employee.role}</p>
              </div>
            </div>
          )}

          <div className="flex items-center p-4 bg-orange-50 rounded-lg">
            <User className="w-5 h-5 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-lg font-semibold text-gray-900">{appointment.customerName}</p>
              <p className="text-sm text-gray-600">{appointment.customerEmail}</p>
              <p className="text-sm text-gray-600">{appointment.customerPhone}</p>
            </div>
          </div>

          {appointment.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}

          {appointment.business?.business_address && (
            <div className="flex items-center p-4 bg-slate-50 rounded-lg">
              <MapPin className="w-5 h-5 text-slate-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-base text-gray-800">{appointment.business.business_address}</p>
              </div>
            </div>
          )}

          {(appointment.business?.phone || appointment.business?.email) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-2">Contact Business</p>
              <div className="space-y-2">
                {appointment.business.phone && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <a href={`tel:${appointment.business.phone}`} className="text-primary hover:underline">
                      {appointment.business.phone}
                    </a>
                  </div>
                )}
                {appointment.business.email && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <a href={`mailto:${appointment.business.email}`} className="text-primary hover:underline">
                      {appointment.business.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background flex flex-col">
      <Header />
      <main className="flex-grow py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          {(status === 'loading' || status === 'confirming') && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                <Loader className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {status === 'loading' ? t('common.loading') : t('confirmAppointment.confirming')}
              </h2>
              <p className="text-gray-600">
                {status === 'loading' 
                  ? t('confirmAppointment.loading') 
                  : t('confirmAppointment.confirming')}
              </p>
            </div>
          )}

          {(status === 'success' || status === 'already-confirmed') && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {status === 'success' ? t('confirmAppointment.success') : t('confirmAppointment.alreadyConfirmed')}
              </h1>
              <p className="text-gray-600 mb-6">{message || t('confirmAppointment.successMessage')}</p>
              <Button
                onClick={() => navigate('/')}
                className="bg-primary hover:bg-primary-light text-white px-8 py-3 text-lg font-semibold"
              >
                {t('confirmAppointment.backToHome')}
              </Button>
            </div>
          )}

          {(status === 'success' || status === 'already-confirmed') && appointment && (
            <>
              {renderAppointmentDetails()}
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-primary hover:bg-primary-light text-white"
              >
                {t('confirmAppointment.backToHome')}
              </Button>
            </>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmAppointment.error')}</h2>
              <p className="text-gray-600 mb-6">{message || t('confirmAppointment.errorMessage')}</p>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-primary hover:bg-primary-light text-white"
              >
                {t('confirmAppointment.backToHome')}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmAppointmentPage;

