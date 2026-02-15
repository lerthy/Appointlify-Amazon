import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  Search,
  Sparkles,
  Zap,
  Award
} from 'lucide-react';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ReviewModal from '../components/shared/ReviewModal';

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
  }
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        // Fetch businesses from backend API
        const API_URL = import.meta.env.VITE_API_URL || '';
        const apiPath = API_URL ? `${API_URL}/api/businesses` : '/api/businesses';
        const response = await fetch(apiPath);
        const result = await response.json();
        
        if (result.success && result.businesses) {
          // Backend already filters businesses with employees, services, and settings
          console.log(`Loaded ${result.businesses.length} businesses from backend`);
          setBusinesses(result.businesses);
          setFilteredBusinesses(result.businesses);
        } else {
          console.error('Failed to fetch businesses:', result.error);
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  // Filter businesses based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(businesses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = businesses.filter(business => {
        const nameMatch = business.name?.toLowerCase().includes(query);
        const descriptionMatch = business.description?.toLowerCase().includes(query);
        const categoryMatch = business.category?.toLowerCase().includes(query);
        const addressMatch = business.business_address?.toLowerCase().includes(query);
        const ownerMatch = business.owner_name?.toLowerCase().includes(query);
        const phoneMatch = business.phone?.toLowerCase().includes(query);
        const websiteMatch = business.website?.toLowerCase().includes(query);
        
        return nameMatch || descriptionMatch || categoryMatch || addressMatch || ownerMatch || phoneMatch || websiteMatch;
      });
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, businesses]);

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch top reviews from context
  const { refreshReviews } = useApp();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* HERO SECTION - Shared for Both Audiences */}
      <section className="relative py-20 overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-primary/90 to-primary-light/90"></div>
            </div>
          ))}
        </div>

        {/* Content Overlay */}
        <div className="relative z-10">
          <Container maxWidth="full">
            <div className="text-center mx-auto">
              {/* Main Headline */}
              <div className="mb-4 inline-flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-yellow-400 mr-2" />
                <span className="text-white text-sm font-medium">{t('home.hero.badge')}</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold mb-5 text-white leading-tight">
                {t('home.hero.title')}
                <br />
                <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                  {t('home.hero.titleHighlight')}
                </span>
              </h1>
              {/* <div className='flex flex-row justify-space-between width-full'>
                <p className="text-lg md:text-xl text-slate-200 mb-3 leading-relaxed max-w-3xl mx-auto">
                  <span className="font-semibold text-white">For Businesses:</span> Streamline operations, reduce no-shows, and grow revenue.
                </p>
                <p className="text-lg md:text-xl text-slate-200 mb-8 leading-relaxed max-w-3xl mx-auto">
                  <span className="font-semibold text-white">For Clients:</span> Find and book appointments instantly, anytime, anywhere.
                </p>
              </div> */}
              {/* <p></p> */}
              {/* Dual CTAs */}
              <p className="text-lg md:text-xl text-slate-200 mb-3 leading-relaxed max-w-3xl mx-auto">{t('home.hero.subtitle')}</p>
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

      {/* SECTION 1: FOR BUSINESSES */}
      <section id="businesses-section" className="py-24 bg-gradient-to-br from-background to-background">
        <Container maxWidth="full">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Users className="w-5 h-5 text-primary mr-2" />
              <span className="text-primary font-semibold">{t('home.forBusinesses.title')}</span>
            </div>
            <h2 className="text-5xl font-extrabold mb-6 text-gray-900">
              {t('home.forBusinesses.headline')}
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              {t('home.forBusinesses.description')}
            </p>
          </div>

          {/* Three Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* Card 1: Time Saving */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-primary">
              {/* <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-primary" />
              </div> */}
              <h3 className="text-2xl font-bold mb-4 text-gray-900">{t('home.forBusinesses.card1Title')}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t('home.forBusinesses.card1Description')}
              </p>
              <div className="flex items-center text-primary font-semibold">
                <Zap className="w-5 h-5 mr-2" />
                <span>{t('home.forBusinesses.card1Feature')}</span>
              </div>
            </div>

            {/* Card 2: Increased Revenue */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-green-500">
              {/* <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div> */}
              <h3 className="text-2xl font-bold mb-4 text-gray-900">{t('home.forBusinesses.card2Title')}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t('home.forBusinesses.card2Description')}
              </p>
              <div className="flex items-center text-green-600 font-semibold">
                <DollarSign className="w-5 h-5 mr-2" />
                <span>{t('home.forBusinesses.card2Feature')}</span>
              </div>
            </div>

            {/* Card 3: More Visibility */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-accent">
              {/* <div className="bg-accent/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-accent" />
              </div> */}
              <h3 className="text-2xl font-bold mb-4 text-gray-900">{t('home.forBusinesses.card3Title')}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t('home.forBusinesses.card3Description')}
              </p>
              <div className="flex items-center text-accent font-semibold">
                <Award className="w-5 h-5 mr-2" />
                <span>{t('home.forBusinesses.card3Feature')}</span>
              </div>
            </div>
          </div>


          {/* Testimonials for Businesses */}
          <div className="max-w-6xl mx-auto mb-12">
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-900">{t('home.forBusinesses.testimonialsTitle')}</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: t('home.forBusinesses.testimonial1Name'),
                  role: t('home.forBusinesses.testimonial1Role'),
                  content: t('home.forBusinesses.testimonial1Content'),
                  rating: 5
                },
                {
                  name: t('home.forBusinesses.testimonial2Name'),
                  role: t('home.forBusinesses.testimonial2Role'),
                  content: t('home.forBusinesses.testimonial2Content'),
                  rating: 5
                },
                {
                  name: t('home.forBusinesses.testimonial3Name'),
                  role: t('home.forBusinesses.testimonial3Role'),
                  content: t('home.forBusinesses.testimonial3Content'),
                  rating: 5
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-primary">
                  <div className="flex mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats for Businesses */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            <div className="bg-white p-6 rounded-xl text-center shadow-lg">
              <div className="text-4xl font-extrabold text-primary mb-2">{t('home.forBusinesses.stat1Value')}</div>
              <div className="text-gray-600 font-medium">{t('home.forBusinesses.stat1Label')}</div>
            </div>
            <div className="bg-white p-6 rounded-xl text-center shadow-lg">
              <div className="text-4xl font-extrabold text-green-600 mb-2">{t('home.forBusinesses.stat2Value')}</div>
              <div className="text-gray-600 font-medium">{t('home.forBusinesses.stat2Label')}</div>
            </div>
            <div className="bg-white p-6 rounded-xl text-center shadow-lg">
              <div className="text-4xl font-extrabold text-accent mb-2">{t('home.forBusinesses.stat3Value')}</div>
              <div className="text-gray-600 font-medium">{t('home.forBusinesses.stat3Label')}</div>
            </div>
            <div className="bg-white p-6 rounded-xl text-center shadow-lg">
              <div className="text-4xl font-extrabold text-orange-600 mb-2">{t('home.forBusinesses.stat4Value')}</div>
              <div className="text-gray-600 font-medium">{t('home.forBusinesses.stat4Label')}</div>
            </div>
          </div>

          {/* CTA for Businesses */}
          <div className="text-center">
            <Button 
              size="md" 
              className="text-base px-8 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-light hover:to-accent shadow-xl hover:shadow-primary/30 transform hover:scale-105 transition-all duration-300 font-semibold"
              onClick={() => navigate('/register')}
            >
              <Users className="mr-2 w-5 h-5" />
              {t('home.forBusinesses.ctaButton')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <p className="mt-3 text-gray-600 text-sm">{t('home.forBusinesses.ctaSubtext')}</p>
          </div>
        </Container>
      </section>

      {/* SECTION 2: FOR CLIENTS */}
      <section id="clients-section" className="py-24 bg-gradient-to-br from-background to-background">
        <Container maxWidth="full">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-accent/10 px-4 py-2 rounded-full mb-4">
              <Calendar className="w-5 h-5 text-accent mr-2" />
              <span className="text-primary font-semibold">{t('home.forClients.title')}</span>
            </div>
            <h2 className="text-5xl font-extrabold mb-6 text-gray-900">
              {t('home.forClients.headline')}
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              {t('home.forClients.description')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                placeholder={t('home.forClients.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-lg"
              />
            </div>
          </div>

          {/* Benefits for Clients */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="bg-accent/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('home.forClients.instantBookingTitle')}</h3>
              <p className="text-gray-600">{t('home.forClients.instantBookingDesc')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('home.forClients.smartRemindersTitle')}</h3>
              <p className="text-gray-600">{t('home.forClients.smartRemindersDesc')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('home.forClients.verifiedReviewsTitle')}</h3>
              <p className="text-gray-600">{t('home.forClients.verifiedReviewsDesc')}</p>
            </div>
          </div>

          {/* All Businesses */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-center mb-4 text-gray-900">
              {searchQuery ? t('home.forClients.searchResults') : t('home.forClients.allBusinesses')}
            </h3>
            <p className="text-center text-gray-600 mb-10">
              {filteredBusinesses.length} {filteredBusinesses.length === 1 ? t('home.forClients.businessFound') : t('home.forClients.businessesFound')} {t('home.forClients.found')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {loading ? (
                <div className="col-span-3 text-center text-gray-500 py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  {t('home.forClients.loadingBusinesses')}
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500 py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">{t('home.forClients.noBusinessesFound')}</p>
                  <p className="text-sm">{t('home.forClients.tryDifferentSearch')}</p>
                </div>
              ) : (
                filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    onClick={() => navigate(`/book/${business.id}`)}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-2 border border-gray-100 group flex flex-col"
                  >
                    <div className="p-6 text-center flex flex-col flex-grow">
                      <div className="mb-4 flex items-center justify-center">
                        {business.logo ? (
                          <img
                            src={business.logo}
                            alt={business.name}
                            className="object-cover rounded-full border-4 border-primary/20 w-20 h-20"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              {business.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{business.name}</h3>
                      <span className="inline-block self-center flex w-fit justify-center items-center bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-2">
                        {business.category || 'Other'}
                      </span>
                      <p className="text-gray-600 mb-4 text-sm line-clamp-2">{business.description}</p>
                      <div className="flex justify-center mb-4">
                        {renderStars(5)}
                        <span className="ml-2 text-sm text-gray-600">(4.9)</span>
                      </div>
                      <Button 
                        className="w-full bg-transparent !text-black border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-semibold hover:!bg-black hover:!text-white focus-visible:outline-none focus-visible:ring-transparent focus-visible:ring-offset-0 focus:outline-none focus:ring-0 mt-auto"
                        size="md"
                      >
                        <Calendar className="mr-2 w-5 h-5" />
                        {t('home.forClients.bookAppointment')}
                        {/* <ArrowRight className="ml-2 w-4 h-4" /> */}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* STATISTICS SECTION - Updated with Benefit-Focused Metrics */}
      {/* <section className="py-12 bg-gradient-to-r from-slate-800 via-purple-900 to-indigo-900 text-white relative overflow-hidden"> */}
        {/* Decorative Elements */}
        {/* <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        </div>
        
        <Container maxWidth="full">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-center mb-2">Trusted by Thousands Worldwide</h2>
            <p className="text-base text-slate-200 text-center mb-8 max-w-2xl mx-auto">
              Join our growing community of satisfied businesses and clients
            </p>
            
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform hover:scale-105 transition-all">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl font-extrabold mb-1">50K+</div>
                <div className="text-slate-200 text-sm">Appointments Booked</div>
                <div className="text-xs text-primary/80 mt-1">This month alone</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform hover:scale-105 transition-all">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
                <div className="text-3xl font-extrabold mb-1">40%</div>
                <div className="text-slate-200 text-sm">Fewer No-Shows</div>
                <div className="text-xs text-green-300 mt-1">With smart reminders</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform hover:scale-105 transition-all">
                <Users className="w-8 h-8 mx-auto mb-3 text-accent" />
                <div className="text-3xl font-extrabold mb-1">25K+</div>
                <div className="text-slate-200 text-sm">Happy Clients Monthly</div>
                <div className="text-xs text-accent/80 mt-1">And growing fast</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform hover:scale-105 transition-all">
                <Award className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <div className="text-3xl font-extrabold mb-1">4.9/5</div>
                <div className="text-slate-200 text-sm">Average Rating</div>
                <div className="text-xs text-yellow-300 mt-1">From 10K+ reviews</div>
              </div>
            </div>
          </div>
        </Container>
      </section> */}

      <Footer />
      
      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitSuccess={async () => {
          await refreshReviews();
        }}
      />
    </div>
  );
};

export default HomePage;
