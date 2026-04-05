import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  Sparkles,
  Zap,
  Award,
  Shield,
  MapPin,
  ChevronRight
} from 'lucide-react';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ReviewModal from '../components/shared/ReviewModal';

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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
  })
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } }
};

function AnimatedCounter({ target }: { target: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [value, setValue] = useState('0');

  useEffect(() => {
    if (!isInView) return;
    const num = parseInt(target.replace(/\D/g, ''));
    if (isNaN(num)) { setValue(target); return; }
    const prefix = target.match(/^[^\d]*/)?.[0] || '';
    const suffix = target.match(/[^\d]*$/)?.[0] || '';
    const duration = 1500;
    const steps = 40;
    const increment = num / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), num);
      setValue(`${prefix}${current.toLocaleString()}${suffix}`);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{value}</span>;
}

const categoryKeyMap: Record<string, string> = {
  'Health & Wellness': 'healthWellness',
  'Beauty & Spa': 'beautySpa',
  'Fitness': 'fitness',
  'Education': 'education',
  'Professional Services': 'professionalServices',
  'Medical': 'medical',
  'Legal': 'legal',
  'Consulting': 'consulting',
  'Automotive': 'automotive',
  'Home Services': 'homeServices',
  'Entertainment': 'entertainment',
  'Other': 'other',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const translateCategory = (category: string | null | undefined): string => {
    if (!category) return t('profile.categories.other');
    const key = categoryKeyMap[category];
    return key ? t(`profile.categories.${key}`) : category;
  };
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const apiPath = API_URL ? `${API_URL}/api/businesses` : '/api/businesses';
        const response = await fetch(apiPath, { signal: controller.signal });
        const result = await response.json();
        
        if (result.success && result.businesses) {
          setBusinesses(result.businesses);
          setFilteredBusinesses(result.businesses);
        } else {
          console.error('Failed to fetch businesses:', result.error);
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Error fetching businesses:', error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchBusinesses();
    return () => controller.abort();
  }, []);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { refreshReviews } = useApp();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-navy-700'}`} />
    ));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
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
                className="w-full h-full object-cover scale-105"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950/97 via-navy-900/93 to-navy-800/88"></div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-[15%] w-96 h-96 bg-steel-400/8 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl animate-pulse-soft"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full">
          <Container maxWidth="full">
            <motion.div 
              className="text-center max-w-4xl mx-auto px-4"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div 
                className="mb-6 inline-flex items-center bg-white/[0.06] backdrop-blur-md px-5 py-2.5 rounded-full border border-white/[0.08]"
                variants={fadeUp}
                custom={0}
              >
                <Sparkles className="w-4 h-4 text-white mr-2" />
                <span className="text-white text-sm font-medium tracking-wide">{t('home.hero.badge')}</span>
              </motion.div>
              
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 text-white leading-[1.1] tracking-tight"
                variants={fadeUp}
                custom={1}
              >
                {t('home.hero.title')}
                <br />
                <span className="gradient-text-hero">
                  {t('home.hero.titleHighlight')}
                </span>
              </motion.h1>

              <motion.p 
                className="text-lg md:text-xl text-white mb-10 leading-relaxed max-w-2xl mx-auto"
                variants={fadeUp}
                custom={2}
              >
                {t('home.hero.subtitle')}
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={fadeUp}
                custom={3}
              >
                <button
                  onClick={() => document.getElementById('clients-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group px-8 py-4 bg-accent hover:bg-steel-400 text-white font-semibold rounded-2xl text-base transition-all duration-300 shadow-ghost-lg hover:shadow-ghost-xl hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  {t('home.forClients.title')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                {!user && (
                <button
                  onClick={() => navigate('/register')}
                  className="group px-8 py-4 bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-sm text-white font-semibold rounded-2xl text-base transition-all duration-300 border border-white/[0.1] hover:border-white/[0.2] flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {t('home.forBusinesses.ctaButton')}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                )}
                {user && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="group px-8 py-4 bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-sm text-white font-semibold rounded-2xl text-base transition-all duration-300 border border-white/[0.1] hover:border-white/[0.2] flex items-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  {t('home.forBusinesses.ctaButtonLoggedIn')}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                )}
              </motion.div>
            </motion.div>
          </Container>
        </div>

        {/* Image Indicators */}
        <div className="absolute bottom-[5.5rem] sm:bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-navy-950/50 backdrop-blur-md border border-white/[0.08] shadow-ghost-lg">
          {heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentImageIndex
                  ? 'bg-accent w-8 shadow-sm'
                  : 'bg-white/60 hover:bg-white w-2.5 opacity-80 hover:opacity-100'
              }`}
              onClick={() => setCurrentImageIndex(index)}
            />
          ))}
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 20C960 40 1200 60 1440 40V80H0Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-12 bg-background relative -mt-1">
        <Container maxWidth="full">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {[
              { value: t('home.forBusinesses.stat1Value'), label: t('home.forBusinesses.stat1Label'), color: 'text-primary' },
              { value: t('home.forBusinesses.stat2Value'), label: t('home.forBusinesses.stat2Label'), color: 'text-accent' },
              { value: t('home.forBusinesses.stat3Value'), label: t('home.forBusinesses.stat3Label'), color: 'text-primary-light' },
              { value: t('home.forBusinesses.stat4Value'), label: t('home.forBusinesses.stat4Label'), color: 'text-steel-400' },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                className="text-center p-5 rounded-2xl bg-white shadow-ghost hover:shadow-ghost-md transition-all duration-300 border border-gray-100"
                variants={fadeUp}
                custom={i}
              >
                <div className={`text-3xl md:text-4xl font-extrabold ${stat.color} mb-1`}>
                  <AnimatedCounter target={stat.value} />
                </div>
                <div className="text-muted text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* FOR BUSINESSES SECTION */}
      <section id="businesses-section" className="py-24 bg-gradient-to-b from-background via-white to-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        
        <Container maxWidth="full">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div 
              className="inline-flex items-center bg-primary/[0.06] border border-primary/10 px-5 py-2 rounded-full mb-5"
              variants={fadeUp}
            >
              <Users className="w-4 h-4 text-primary mr-2" />
              <span className="text-primary font-semibold text-sm">{t('home.forBusinesses.title')}</span>
            </motion.div>
            <motion.h2 
              className="text-4xl md:text-5xl font-extrabold mb-5 text-navy-900 tracking-tight"
              variants={fadeUp}
            >
              {t('home.forBusinesses.headline')}
            </motion.h2>
            <motion.p 
              className="text-lg text-muted max-w-2xl mx-auto leading-relaxed"
              variants={fadeUp}
            >
              {t('home.forBusinesses.description')}
            </motion.p>
          </motion.div>

          {/* Benefit Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {[
              {
                icon: <Clock className="w-6 h-6 text-primary" />,
                iconBg: 'bg-primary/[0.06]',
                borderColor: 'border-primary/10',
                accentColor: 'text-primary',
                title: t('home.forBusinesses.card1Title'),
                description: t('home.forBusinesses.card1Description'),
                feature: t('home.forBusinesses.card1Feature'),
                featureIcon: <Zap className="w-4 h-4" />
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-accent" />,
                iconBg: 'bg-accent/[0.08]',
                borderColor: 'border-accent/15',
                accentColor: 'text-accent',
                title: t('home.forBusinesses.card2Title'),
                description: t('home.forBusinesses.card2Description'),
                feature: t('home.forBusinesses.card2Feature'),
                featureIcon: <DollarSign className="w-4 h-4" />
              },
              {
                icon: <Award className="w-6 h-6 text-steel-400" />,
                iconBg: 'bg-steel-50',
                borderColor: 'border-steel-100',
                accentColor: 'text-steel-400',
                title: t('home.forBusinesses.card3Title'),
                description: t('home.forBusinesses.card3Description'),
                feature: t('home.forBusinesses.card3Feature'),
                featureIcon: <Award className="w-4 h-4" />
              }
            ].map((card, i) => (
              <motion.div 
                key={i}
                className={`group bg-white p-8 rounded-2xl shadow-ghost hover:shadow-ghost-lg transition-all duration-500 border ${card.borderColor} hover:-translate-y-1`}
                variants={fadeUp}
                custom={i}
              >
                <div className={`${card.iconBg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-navy-900">{card.title}</h3>
                <p className="text-muted leading-relaxed mb-5">{card.description}</p>
                <div className={`flex items-center ${card.accentColor} font-semibold text-sm`}>
                  {card.featureIcon}
                  <span className="ml-2">{card.feature}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <motion.div 
            className="max-w-6xl mx-auto mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h3 
              className="text-3xl font-bold text-center mb-10 text-navy-900"
              variants={fadeUp}
            >
              {t('home.forBusinesses.testimonialsTitle')}
            </motion.h3>
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
                <motion.div 
                  key={index} 
                  className="bg-white p-7 rounded-2xl shadow-ghost border border-gray-100 hover:shadow-ghost-md transition-all duration-300 hover:-translate-y-1"
                  variants={fadeUp}
                  custom={index}
                >
                  <div className="flex mb-4 gap-0.5">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-muted mb-5 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted">{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            {!user ? (
              <>
                <Button 
                  size="lg" 
                  className="px-10 py-4 rounded-2xl bg-primary text-white hover:bg-primary-light shadow-ghost-lg hover:shadow-ghost-xl transform hover:-translate-y-0.5 transition-all duration-300 font-semibold text-base"
                  onClick={() => navigate('/register')}
                >
                  <Users className="mr-2 w-5 h-5" />
                  {t('home.forBusinesses.ctaButton')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <p className="mt-4 text-muted text-sm">{t('home.forBusinesses.ctaSubtext')}</p>
              </>
            ) : (
              <Button 
                size="lg" 
                className="px-10 py-4 rounded-2xl bg-primary text-white hover:bg-primary-light shadow-ghost-lg hover:shadow-ghost-xl transform hover:-translate-y-0.5 transition-all duration-300 font-semibold text-base"
                onClick={() => navigate('/pricing')}
              >
                <DollarSign className="mr-2 w-5 h-5" />
                {t('home.forBusinesses.ctaButtonLoggedIn')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </motion.div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <Container maxWidth="full">
          <motion.div 
            className="relative z-10 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div className="text-center mb-14" variants={fadeUp}>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                {t('home.forClients.instantBookingTitle')}
              </h2>
              <p className="text-steel-300 text-lg max-w-xl mx-auto">{t('home.forClients.instantBookingDesc')}</p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Search className="w-7 h-7" />, step: '01', title: t('home.forClients.instantBookingTitle'), desc: t('home.forClients.instantBookingDesc') },
                { icon: <Calendar className="w-7 h-7" />, step: '02', title: t('home.forClients.smartRemindersTitle'), desc: t('home.forClients.smartRemindersDesc') },
                { icon: <CheckCircle className="w-7 h-7" />, step: '03', title: t('home.forClients.verifiedReviewsTitle'), desc: t('home.forClients.verifiedReviewsDesc') }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  className="text-center"
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="relative inline-flex mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-white">
                      {item.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold shadow-ghost-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-steel-400 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* FOR CLIENTS SECTION */}
      <section id="clients-section" className="py-24 bg-gradient-to-b from-background via-white to-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <Container maxWidth="full">
          <motion.div 
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div 
              className="inline-flex items-center bg-accent/[0.06] border border-accent/10 px-5 py-2 rounded-full mb-5"
              variants={fadeUp}
            >
              <Calendar className="w-4 h-4 text-accent mr-2" />
              <span className="text-primary font-semibold text-sm">{t('home.forClients.title')}</span>
            </motion.div>
            <motion.h2 
              className="text-4xl md:text-5xl font-extrabold mb-5 text-navy-900 tracking-tight"
              variants={fadeUp}
            >
              {t('home.forClients.headline')}
            </motion.h2>
            <motion.p 
              className="text-lg text-muted max-w-2xl mx-auto leading-relaxed"
              variants={fadeUp}
            >
              {t('home.forClients.description')}
            </motion.p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="max-w-2xl mx-auto mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/20 to-primary-light/20 rounded-2xl blur opacity-0 group-focus-within:opacity-40 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative flex items-center bg-white rounded-2xl shadow-ghost-md border border-gray-200 group-focus-within:border-accent/40 transition-all duration-300 overflow-hidden">
                <div className="pl-5 pr-3 flex items-center">
                  <Search className="w-5 h-5 text-muted group-focus-within:text-accent transition-colors duration-200 flex-shrink-0" />
                </div>
                <input
                  type="text"
                  placeholder={t('home.forClients.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-4 pr-4 text-[15px] text-navy-900 bg-transparent outline-none placeholder:text-muted"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mr-3 w-7 h-7 rounded-full bg-surface hover:bg-steel-100 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <span className="text-muted text-sm leading-none">✕</span>
                  </button>
                )}
                <div className="mr-3 hidden sm:flex items-center gap-1 bg-primary/[0.06] text-primary text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">
                  <Search className="w-3 h-3" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* All Businesses */}
          <div className="mb-12">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/[0.06] mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
                <p className="text-muted">{t('home.forClients.loadingBusinesses')}</p>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface mb-4">
                  <Calendar className="w-8 h-8 text-muted" />
                </div>
                <p className="text-lg text-navy-800 font-medium mb-1">{t('home.forClients.noBusinessesFound')}</p>
                <p className="text-sm text-muted">{t('home.forClients.tryDifferentSearch')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                {filteredBusinesses.map((business, i) => {
                  const address = business.business_address;
                  const showAddress = address && !address.startsWith('http') && !address.startsWith('www') && address.length < 80;
                  const hasDesc = business.description && business.description.trim().length > 3;

                  return (
                    <motion.div
                      key={business.id}
                      onClick={() => navigate(`/book/${business.id}`)}
                      className="group relative bg-white rounded-2xl border border-gray-200 shadow-ghost cursor-pointer flex flex-col p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-ghost-xl active:translate-y-0 active:scale-[0.99] outline-none"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.35, ease: 'easeOut' }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        {business.logo ? (
                          <img
                            src={business.logo}
                            alt={business.name}
                            className="w-14 h-14 object-cover rounded-xl flex-shrink-0 bg-surface border border-gray-100 group-hover:border-accent/30 transition-colors duration-300"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl flex-shrink-0 bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center shadow-ghost">
                            <span className="text-white text-xl font-bold">
                              {business.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="text-[15px] font-bold text-navy-900 group-hover:text-primary transition-colors truncate leading-snug">
                            {business.name}
                          </h3>
                          <span className="inline-block mt-1 text-[11px] font-medium text-accent bg-accent/[0.08] px-2 py-0.5 rounded-full">
                            {translateCategory(business.category)}
                          </span>
                        </div>
                      </div>

                      {hasDesc && (
                        <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3">
                          {business.description}
                        </p>
                      )}

                      <div className="h-px bg-gray-100 mb-3" />

                      <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            {renderStars(5)}
                            <span className="text-[11px] text-muted font-medium ml-1.5">4.9</span>
                          </div>
                          {showAddress && (
                            <div className="flex items-center text-muted text-[11px] gap-1 max-w-[140px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{address}</span>
                            </div>
                          )}
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-surface/60 text-navy-800 font-semibold text-sm transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                          <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          {t('home.forClients.bookAppointment')}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* TRUST SECTION */}
      <section className="py-16 bg-white border-t border-gray-100">
        <Container maxWidth="full">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div className="flex items-center justify-center gap-2 mb-4" variants={fadeUp}>
              <Shield className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-muted uppercase tracking-wider">{t('home.forBusinesses.ctaSubtext')}</span>
            </motion.div>
            <motion.div 
              className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-muted"
              variants={fadeUp}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span>99.9% Uptime</span>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <Footer />
      
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
