import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Calendar, Clock, User, Phone, Mail } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import Button from '../components/ui/Button';

interface BookingConfirmationData {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  price: number;
  businessLogo?: string;
  cancelLink: string;
}

const BookingConfirmationPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState<BookingConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('BookingConfirmationPage: location state:', location.state);
    console.log('BookingConfirmationPage: location search:', location.search);
    
    // Get booking data from location state or URL params
    const stateData = location.state as BookingConfirmationData;
    if (stateData) {
      console.log('BookingConfirmationPage: Using state data:', stateData);
      setBookingData(stateData);
    } else {
      console.log('BookingConfirmationPage: No state data, checking URL params');
      // If no state data, try to get from URL params
      const params = new URLSearchParams(location.search);
      const appointmentId = params.get('appointmentId');
      if (appointmentId) {
        console.log('BookingConfirmationPage: Found appointmentId in URL:', appointmentId);
        // You could fetch the appointment details from the database here
        // For now, we'll show a generic message
        setBookingData({
          appointmentId,
          customerName: 'Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          businessName: 'Business',
          serviceName: 'Service',
          appointmentDate: new Date().toLocaleDateString(),
          appointmentTime: '10:00 AM',
          duration: 60,
          price: 50,
          cancelLink: `/cancel/${appointmentId}`
        });
      } else {
        console.log('BookingConfirmationPage: No appointmentId found in URL');
      }
    }
    setLoading(false);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('bookingConfirmation.loading')}</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('bookingConfirmation.notFound')}</h2>
          <p className="text-gray-600 mb-6">{t('bookingConfirmation.notFoundMessage')}</p>
          <Button onClick={() => navigate('/')}>
            {t('bookingConfirmation.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="flex-grow py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          {/* Success Confirmation Message */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 bg-green-100 rounded-full mb-6 shadow-lg">
              <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('bookingConfirmation.confirmed')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 font-medium max-w-md mx-auto">
              {t('bookingConfirmation.successMessage')}
            </p>
          </div>

          {/* Booking Details Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 mb-6">
            <div className="flex flex-row sm:flex-col items-center justify-center mb-6">
              {bookingData.businessLogo ? (
                <img
                  src={bookingData.businessLogo}
                  alt={bookingData.businessName}
                  className="w-16 h-16 rounded-full object-cover border-4 border-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {bookingData.businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{bookingData.businessName}</h2>
                <p className="text-gray-600">{bookingData.serviceName}</p>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bookingConfirmation.date')}</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(bookingData.appointmentDate)}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bookingConfirmation.time')}</p>
                  <p className="text-lg font-semibold text-gray-900">{formatTime(bookingData.appointmentTime)}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                <User className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bookingConfirmation.name')}</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerName}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-orange-50 rounded-lg">
                <Phone className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bookingConfirmation.phone')}</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bookingConfirmation.email')}</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerEmail}</p>
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="mt-6 p-4 sm:p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('bookingConfirmation.bookingDetails')}</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">{t('bookingConfirmation.duration')}:</span>
                <span className="text-sm sm:text-base font-semibold">{bookingData.duration} {t('bookingConfirmation.minutes')}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm sm:text-base text-gray-600">{t('bookingConfirmation.price')}:</span>
                <span className="text-sm sm:text-base font-semibold text-green-600">${bookingData.price.toFixed(2)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm sm:text-base text-gray-600 mb-2">{t('bookingConfirmation.confirmationNumber')}:</p>
                <p className="font-mono text-xs sm:text-sm text-gray-800 bg-white px-3 py-2 rounded border border-gray-200 break-all">{bookingData.appointmentId}</p>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button
                onClick={() => navigate('/')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('bookingConfirmation.backToHome')}
              </Button>
              <Button
                onClick={() => window.open(bookingData.cancelLink, '_blank')}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                {t('cancelAppointment.cancelButton')}
              </Button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">{t('bookingConfirmation.confirmationSent')}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmationPage;
