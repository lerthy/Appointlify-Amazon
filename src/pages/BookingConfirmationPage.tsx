import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, MapPin, Phone, Mail } from 'lucide-react';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState<BookingConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get booking data from location state or URL params
    const stateData = location.state as BookingConfirmationData;
    if (stateData) {
      setBookingData(stateData);
    } else {
      // If no state data, try to get from URL params
      const params = new URLSearchParams(location.search);
      const appointmentId = params.get('appointmentId');
      if (appointmentId) {
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
      }
    }
    setLoading(false);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find the booking details.</p>
          <Button onClick={() => navigate('/')}>
            Back to Home
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
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="flex-grow py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your appointment has been successfully scheduled</p>
          </div>

          {/* Booking Details Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center mb-6">
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
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">{bookingData.businessName}</h2>
                <p className="text-gray-600">{bookingData.serviceName}</p>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(bookingData.appointmentDate)}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-lg font-semibold text-gray-900">{formatTime(bookingData.appointmentTime)}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                <User className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerName}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-orange-50 rounded-lg">
                <Phone className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{bookingData.customerEmail}</p>
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Summary</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{bookingData.duration} minutes</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-green-600">${bookingData.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-mono text-sm text-gray-500">{bookingData.appointmentId}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Back to Home
            </Button>
            <Button
              onClick={() => window.open(bookingData.cancelLink, '_blank')}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel Booking
            </Button>
          </div>

          {/* Additional Information */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">A confirmation email has been sent to {bookingData.customerEmail}</p>
            <p>You'll receive a reminder 24 hours before your appointment</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmationPage;
