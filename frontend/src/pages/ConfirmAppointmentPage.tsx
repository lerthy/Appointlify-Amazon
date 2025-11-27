import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirming' | 'success' | 'error' | 'already-confirmed'>('loading');
  const [message, setMessage] = useState('');
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token provided');
      return;
    }

    const fetchAppointment = async () => {
      try {
        // Check if we're in development mode without local server
        const isDevelopment = import.meta.env.DEV;
        const isLocalhost = window.location.hostname === 'localhost';
        
        let endpoint: string;
        
        if (isDevelopment && isLocalhost && window.location.port !== '8888') {
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
        
        const data = await response.json();

        if (response.ok && data.success) {
          setAppointment(data.appointment);
          
          if (data.appointment.confirmationStatus === 'confirmed') {
            setStatus('already-confirmed');
            setMessage('This appointment has already been confirmed');
          } else if (data.appointment.isExpired) {
            setStatus('error');
            setMessage('This confirmation link has expired. Please contact the business to reschedule.');
          } else {
            setStatus('ready');
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to load appointment details');
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    fetchAppointment();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;

    setStatus('confirming');

    try {
      // Check if we're in development mode without local server
      const isDevelopment = import.meta.env.DEV;
      const isLocalhost = window.location.hostname === 'localhost';
      
      let endpoint: string;
      
      if (isDevelopment && isLocalhost && window.location.port !== '8888') {
        // Use Express server endpoint for local dev
        endpoint = `/api/confirm-appointment?token=${token}`;
      } else {
        // Use Netlify function (production or netlify dev)
        endpoint = `/.netlify/functions/confirm-appointment?token=${token}`;
      }
      
      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message);
        if (data.appointment) {
          setAppointment(prev => prev ? { ...prev, confirmationStatus: 'confirmed' } : null);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Confirmation failed');
      }
    } catch (error) {
      console.error('Error confirming appointment:', error);
      setStatus('error');
      setMessage('An error occurred during confirmation. Please try again.');
    }
  };

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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {(appointment.business?.name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{appointment.business?.name || 'Business'}</h2>
            <p className="text-gray-600">{appointment.service?.name || 'Appointment'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(appointmentDate)}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-purple-50 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(appointmentDate)} ({appointment.duration} minutes)
              </p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Service</p>
              <p className="text-lg font-semibold text-gray-900">{appointment.service?.name || 'Service'}</p>
              {appointment.service?.price && (
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
                    <a href={`tel:${appointment.business.phone}`} className="text-indigo-600 hover:underline">
                      {appointment.business.phone}
                    </a>
                  </div>
                )}
                {appointment.business.email && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <a href={`mailto:${appointment.business.email}`} className="text-indigo-600 hover:underline">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />
      <main className="flex-grow py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          {status === 'loading' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading</h2>
              <p className="text-gray-600">Fetching appointment details...</p>
            </div>
          )}

          {status === 'ready' && appointment && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                  <Clock className="w-10 h-10 text-yellow-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Appointment</h1>
                <p className="text-gray-600">Review the details below and confirm to secure your booking.</p>
              </div>
              {renderAppointmentDetails()}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirm Appointment
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to Home
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-3">
                By confirming, you acknowledge that you will attend this appointment.
              </p>
            </>
          )}

          {status === 'confirming' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming</h2>
              <p className="text-gray-600">We&apos;re confirming your appointment...</p>
            </div>
          )}

          {(status === 'success' || status === 'already-confirmed') && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {status === 'success' ? 'Appointment Confirmed!' : 'Already Confirmed'}
              </h1>
              <p className="text-gray-600">{message || 'Your appointment is confirmed. We look forward to seeing you!'}</p>
            </div>
          )}

          {(status === 'success' || status === 'already-confirmed') && appointment && (
            <>
              {renderAppointmentDetails()}
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Back to Home
              </Button>
            </>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
              <p className="text-gray-600 mb-6">{message || 'Something went wrong. Please try again later.'}</p>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Back to Home
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

