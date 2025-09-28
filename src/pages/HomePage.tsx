import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Users,
  Shield
} from 'lucide-react';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ReviewModal from '../components/shared/ReviewModal';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';


// Background images for the hero section
const heroImages = [
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    alt: "Business meeting and appointment scheduling"
  },
  {
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2076&q=80",
    alt: "Professional calendar and scheduling"
  },
  {
    url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    alt: "Team collaboration and planning"
  },
  {
    url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    alt: "Customer service and appointment booking"
  },
  {
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80",
    alt: "Business team working together"
  }
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [paidUser, setPaidUser] = useState<{ payment: string } | null>(null);
  
  const { user, logout } = useAuth();

  const isPaidUser = ['basic', 'pro', 'team'].includes(paidUser?.payment || '');
  
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, description, logo');
      if (!error && data) {
        setBusinesses(data);
      }
      setLoading(false);
    };
    fetchBusinesses();
  }, []);

  useEffect(() => {
      const checkAuthAndPayment = async () => {
        // if (!user || !user.id) {
        //   navigate('/login');
        //   return;
        // }
        setLoading(true);
        const { data: paidUserData, error } = await supabase
          .from('users')
          .select('payment')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching payment status:', error);
        } else {
          setPaidUser(paidUserData);
        }
        setLoading(false);
      };
      checkAuthAndPayment();
    }, [user, navigate]);

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Clock className="w-8 h-8 text-indigo-600" />,
      title: "24/7 Booking",
      description: "Book appointments anytime, anywhere with our seamless online platform"
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-emerald-600" />,
      title: "Instant Confirmation",
      description: "Get immediate confirmation and reminders for all your appointments"
    },
    {
      icon: <Users className="w-8 h-8 text-violet-600" />,
      title: "Business Management",
      description: "Complete solution for businesses to manage appointments and customers"
    },
    {
      icon: <Shield className="w-8 h-8 text-amber-600" />,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security measures"
    }
  ];

  // Fetch top reviews from context
  const { getTopReviews, refreshReviews } = useApp();
  const testimonials = getTopReviews(3).map(review => ({
    name: review.customer_name,
    role: review.business_id, // We'll need to fetch business name later if needed
    content: review.content,
    rating: review.rating
  }));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section with Dynamic Background */}
      <section className="relative py-36 overflow-hidden">
        {/* Background Images */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-indigo-900/70 to-slate-900/80"></div>
            </div>
          ))}
        </div>

        {/* Content Overlay */}
        <div className="relative z-10">
          <Container maxWidth="full">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
                Smart Appointment Booking
              </h1>
              <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                Streamline your business with our intelligent appointment scheduling platform. 
                Book, manage, and grow your business with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {isPaidUser 
                ? null 
                : <Button 
                    size="lg" 
                    className="text-lg px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold"
                    onClick={() => navigate('/pricing')}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                }
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-indigo-600 outline-none focus:ring-0"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </Container>
        </div>

        {/* Image Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              onClick={() => setCurrentImageIndex(index)}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-36 bg-white">
        <Container maxWidth="full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make appointment booking effortless for both businesses and customers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-8 rounded-xl bg-white border border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-slate-800 to-indigo-800 text-white">
        <Container maxWidth="full">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-slate-200">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-slate-200">Businesses</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-slate-200">Uptime</div>
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <Container maxWidth="full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Trusted by businesses worldwide</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.length > 0 ? (
              testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">Verified Customer</div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to static testimonials if no reviews available
              [
                {
                  name: "Sarah Johnson",
                  role: "Fitness Studio Owner",
                  content: "This platform transformed how we manage appointments. Our clients love the easy booking process!",
                  rating: 5
                },
                {
                  name: "Mike Chen",
                  role: "Spa Manager", 
                  content: "The automated reminders and calendar integration saved us hours every week.",
                  rating: 5
                },
                {
                  name: "Emily Rodriguez",
                  role: "Dental Practice",
                  content: "Professional, reliable, and incredibly user-friendly. Highly recommended!",
                  rating: 5
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Write a Review CTA */}
          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-6">
              Have you used our platform? Share your experience with others!
            </p>
            <Button 
              onClick={() => setIsReviewModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
            >
              <Star className="w-5 h-5 mr-2" />
              Write a Review
            </Button>
          </div>
        </Container>
      </section>

      {/* Available Businesses Section */}
      <section className="py-20 bg-white">
        <Container maxWidth="full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Book Your Appointment</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our network of trusted businesses and book your appointment in seconds
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 px-4">
            {loading ? (
              <div className="text-center text-gray-500 py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                Loading businesses...
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No businesses available at the moment.</p>
                <p className="text-sm">Check back soon for new businesses joining our platform!</p>
              </div>
            ) : (
              businesses.map((business) => (
                <div
                  key={business.id}
                  onClick={() => navigate(`/book/${business.id}`)}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden w-full max-w-sm flex flex-col hover:cursor-pointer"
                  onMouseEnter={() => { (document.querySelector(`.book-appointment-btn-${business.id}`) as HTMLDivElement).classList.add('text-black', 'text-4xl', 'font-bold', 'border-2', 'border-black');
                                        document.querySelector(`.book-appointment-btn-${business.id}`)?.classList.remove('text-white'); }}
                  onMouseLeave={() => { (document.querySelector(`.book-appointment-btn-${business.id}`) as HTMLDivElement).classList.remove('text-black', 'text-4xl', 'font-bold', 'border-2', 'border-black');
                                        document.querySelector(`.book-appointment-btn-${business.id}`)?.classList.add('text-white'); }}
                >
                  <div className="p-8 text-center flex-1 flex flex-col">
                    <div className="mb-6 flex items-center justify-center">
                      {business.logo ? (
                        <img
                          src={business.logo}
                          alt={business.name}
                          className="object-contain rounded-full border-4 border-gray-100 w-24 h-24"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900">{business.name}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed flex-1">{business.description}</p>
                    <Button 
                      className={`book-appointment-btn-${business.id} w-full bg-transparent text-white font-semibold hover:bg-transparent focus:ring-0 focus:outline-none`}
                      size="lg"
                    >
                      Book Appointment
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-800 to-indigo-800 text-white">
        <Container maxWidth="full">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-slate-200">
              Join thousands of businesses already using our platform to streamline their appointment booking process.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {isPaidUser 
            ? null 
            : <Button 
                  size="lg" 
                  className="text-lg px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold"
                  onClick={() => navigate('/pricing')}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              }
              {user ? null : <Button 
                variant="outline" 
                size="lg" 
                className="text-base px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-indigo-600"
                onClick={() => navigate('/login')}
              >
                Register
              </Button>}
            </div>
          </div>
        </Container>
      </section>

      <Footer />
      
      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitSuccess={async () => {
          // Refresh reviews to show the new review immediately
          await refreshReviews();
        }}
      />
    </div>
  );
};

export default HomePage;
