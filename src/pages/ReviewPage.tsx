import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ReviewForm from '../components/shared/ReviewForm';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';

const ReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get parameters from URL
  const businessId = searchParams.get('businessId');
  const appointmentId = searchParams.get('appointmentId');
  const customerId = searchParams.get('customerId');
  const customerName = searchParams.get('customerName');
  const customerEmail = searchParams.get('customerEmail');

  const handleSubmitSuccess = () => {
    // Redirect to thank you page or homepage after successful submission
    setTimeout(() => {
      navigate('/', { 
        state: { 
          message: 'Thank you for your review! Your feedback is valuable to us.' 
        }
      });
    }, 2000);
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      {/* Header Section */}
      <section className="py-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <Container maxWidth="full">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Star className="w-16 h-16 text-yellow-300" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Share Your Experience
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Your feedback helps us improve our services and helps other customers make informed decisions
            </p>
          </div>
        </Container>
      </section>

      {/* Navigation */}
      <section className="py-4 bg-white border-b">
        <Container maxWidth="full">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Container>
      </section>

      {/* Review Form Section */}
      <section className="flex-1 py-12">
        <Container maxWidth="full">
          <ReviewForm
            businessId={businessId || undefined}
            appointmentId={appointmentId || undefined}
            customerId={customerId || undefined}
            customerName={customerName || undefined}
            customerEmail={customerEmail || undefined}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleCancel}
          />
        </Container>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <Container maxWidth="full">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Why Your Review Matters
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Help Others Decide</h3>
                <p className="text-gray-600">
                  Your honest feedback helps other customers choose the right service
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Improve Service</h3>
                <p className="text-gray-600">
                  Businesses use your feedback to enhance their services and customer experience
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Build Community</h3>
                <p className="text-gray-600">
                  Join a community of customers sharing authentic experiences and recommendations
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
};

export default ReviewPage;
