import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Calendar, Clock, User, Briefcase, MapPin, Phone, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
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
      <div className="space-y-4">
        {appointment.business?.logo && (
          <div className="flex justify-center mb-4">
            <img 
              src={appointment.business.logo} 
              alt={appointment.business.name}
              className="h-16 w-auto object-contain"
            />
          </div>
        )}

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {appointment.business?.name || 'Business'}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
              <span>{formatDate(appointmentDate)}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Clock className="w-4 h-4 mr-2 text-indigo-600" />
              <span>{formatTime(appointmentDate)} ({appointment.duration} minutes)</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <Briefcase className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{appointment.service?.name || 'Service'}</p>
              {appointment.service?.description && (
                <p className="text-sm text-gray-600">{appointment.service.description}</p>
              )}
              {appointment.service?.price && (
                <p className="text-sm text-green-600 font-semibold mt-1">
                  ${appointment.service.price}
                </p>
              )}
            </div>
          </div>

          {appointment.employee && (
            <div className="flex items-start p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{appointment.employee.name}</p>
                <p className="text-sm text-gray-600">{appointment.employee.role}</p>
              </div>
            </div>
          )}

          <div className="flex items-start p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Customer: {appointment.customerName}</p>
              <p className="text-sm text-gray-600">{appointment.customerEmail}</p>
              <p className="text-sm text-gray-600">{appointment.customerPhone}</p>
            </div>
          </div>

          {appointment.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
              <p className="text-sm text-gray-600">{appointment.notes}</p>
            </div>
          )}

          {appointment.business?.business_address && (
            <div className="flex items-start p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">{appointment.business.business_address}</p>
              </div>
            </div>
          )}

          {(appointment.business?.phone || appointment.business?.email) && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-2">Contact Business:</p>
              <div className="space-y-1">
                {appointment.business.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`tel:${appointment.business.phone}`} className="text-indigo-600 hover:underline">
                      {appointment.business.phone}
                    </a>
                  </div>
                )}
                {appointment.business.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-gray-900">
            Appointment Confirmation
          </h1>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600 text-center">Loading appointment details...</p>
            </div>
          )}

          {status === 'ready' && appointment && (
            <>
              {renderAppointmentDetails()}
              <div className="mt-6">
                <Button
                  onClick={handleConfirm}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Confirm Appointment
                </Button>
                <p className="text-xs text-center text-gray-500 mt-3">
                  By confirming, you acknowledge that you will attend this appointment.
                </p>
              </div>
            </>
          )}

          {status === 'confirming' && (
            <div className="flex flex-col items-center py-8">
              <Loader className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600 text-center">Confirming your appointment...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Appointment Confirmed!
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message} We look forward to seeing you!
              </p>
              {appointment && renderAppointmentDetails()}
              <Button
                onClick={() => navigate('/')}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Back to Home
              </Button>
            </div>
          )}

          {status === 'already-confirmed' && appointment && (
            <div className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-blue-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Already Confirmed
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message}
              </p>
              {renderAppointmentDetails()}
              <Button
                onClick={() => navigate('/')}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Back to Home
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Confirmation Failed
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {message}
              </p>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmAppointmentPage;

