import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import Button from '../components/ui/Button';
import { buildGoogleCalendarUrl } from '../utils/calendar';

interface BookingConfirmationData {
  appointmentId: string;
  serviceName: string;
  employeeName?: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  location?: string;
  price?: number;
  cancelLink: string;
  // Legacy/fallback fields (optional for URL-param fallback)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  businessName?: string;
  businessLogo?: string;
}

const BookingConfirmationPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState<BookingConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stateData = location.state as BookingConfirmationData | null;
    if (stateData && stateData.appointmentId && stateData.serviceName) {
      setBookingData({
        appointmentId: stateData.appointmentId,
        serviceName: stateData.serviceName,
        employeeName: stateData.employeeName,
        appointmentDate: stateData.appointmentDate,
        appointmentTime: stateData.appointmentTime,
        duration: stateData.duration ?? 60,
        location: stateData.location,
        price: stateData.price,
        cancelLink: stateData.cancelLink ?? `/cancel/${stateData.appointmentId}`,
      });
    } else {
      const params = new URLSearchParams(location.search);
      const appointmentId = params.get('appointmentId');
      if (appointmentId) {
        setBookingData({
          appointmentId,
          serviceName: 'Service',
          appointmentDate: new Date().toISOString().slice(0, 10),
          appointmentTime: '10:00',
          duration: 60,
          cancelLink: `/cancel/${appointmentId}`,
        });
      }
    }
    setLoading(false);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('bookingConfirmation.loading')}</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background flex items-center justify-center">
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
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const normalized = String(timeString).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(normalized)) {
      return new Date(`2000-01-01T${normalized}`).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return normalized;
  };

  const handleAddToCalendar = () => {
    const url = buildGoogleCalendarUrl(
      bookingData.serviceName,
      bookingData.appointmentDate,
      bookingData.appointmentTime,
      bookingData.duration,
      bookingData.location
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleManageAppointment = () => {
    navigate(bookingData.cancelLink);
  };

  const showPrice = bookingData.price != null && bookingData.price !== undefined;
  const showLocation = Boolean(bookingData.location && String(bookingData.location).trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background">
      <Header />

      <main className="flex-grow py-8 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          {/* Success block */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('bookingConfirmation.confirmed')}
            </h1>
            <p className="text-gray-600">
              {t('bookingConfirmation.successMessage')}
            </p>
          </div>

          {/* Centered card - details only */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.service')}</dt>
                <dd className="mt-0.5 text-base font-semibold text-gray-900">{bookingData.serviceName}</dd>
              </div>

              {bookingData.employeeName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.employee')}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-gray-900">{bookingData.employeeName}</dd>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.date')}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-gray-900">{formatDate(bookingData.appointmentDate)}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.time')}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-gray-900">{formatTime(bookingData.appointmentTime)}</dd>
                </div>
              </div>

              {showLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.location')}</dt>
                    <dd className="mt-0.5 text-base font-semibold text-gray-900">{bookingData.location}</dd>
                  </div>
                </div>
              )}

              {showPrice && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('bookingConfirmation.price')}</dt>
                    <dd className="mt-0.5 text-base font-semibold text-green-600">
                      ${Number(bookingData.price).toFixed(2)}
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={handleAddToCalendar}
                className="w-full bg-primary hover:bg-primary-light text-white"
              >
                {t('bookingConfirmation.addToCalendar')}
              </Button>
              <Button
                onClick={handleManageAppointment}
                variant="outline"
                className="w-full"
              >
                {t('bookingConfirmation.manageAppointment')}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmationPage;
