import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  Users, 
  Bell, 
  BarChart3, 
  MessageSquare, 
  Zap, 
  Shield,
  Check,
  ArrowRight,
  Smartphone,
  Globe,
  Settings
} from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const ServicesPage: React.FC = () => {
  const { t } = useTranslation();

  const mainServices = [
    {
      icon: Calendar,
      title: t('services.smartBooking.title'),
      description: t('services.smartBooking.description'),
      features: [
        t('services.smartBooking.features.realTime'),
        t('services.smartBooking.features.calendar'),
        t('services.smartBooking.features.recurring'),
        t('services.smartBooking.features.multiLocation'),
        t('services.smartBooking.features.timezone'),
        t('services.smartBooking.features.confirmations')
      ],
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Supabase'],
    },
    {
      icon: Bell,
      title: t('services.reminders.title'),
      description: t('services.reminders.description'),
      features: [
        t('services.reminders.features.email'),
        t('services.reminders.features.sms'),
        t('services.reminders.features.templates'),
        t('services.reminders.features.multiple'),
        t('services.reminders.features.auto'),
        t('services.reminders.features.followUp')
      ],
      technologies: ['Twilio', 'SendGrid', 'Node.js', 'Cron Jobs'],
    },
    {
      icon: Users,
      title: t('services.customerMgmt.title'),
      description: t('services.customerMgmt.description'),
      features: [
        t('services.customerMgmt.features.database'),
        t('services.customerMgmt.features.history'),
        t('services.customerMgmt.features.notes'),
        t('services.customerMgmt.features.contacts'),
        t('services.customerMgmt.features.analytics'),
        t('services.customerMgmt.features.export')
      ],
      technologies: ['Supabase', 'PostgreSQL', 'React', 'TypeScript'],
    },
    {
      icon: BarChart3,
      title: t('services.analyticsReports.title'),
      description: t('services.analyticsReports.description'),
      features: [
        t('services.analyticsReports.features.booking'),
        t('services.analyticsReports.features.revenue'),
        t('services.analyticsReports.features.customer'),
        t('services.analyticsReports.features.performance'),
        t('services.analyticsReports.features.dashboards'),
        t('services.analyticsReports.features.export')
      ],
      technologies: ['Chart.js', 'React', 'PostgreSQL', 'Data Visualization'],
    },
    {
      icon: MessageSquare,
      title: t('services.aiChatbot.title'),
      description: t('services.aiChatbot.description'),
      features: [
        t('services.aiChatbot.features.availability'),
        t('services.aiChatbot.features.nlp'),
        t('services.aiChatbot.features.booking'),
        t('services.aiChatbot.features.faq'),
        t('services.aiChatbot.features.multiLang'),
        t('services.aiChatbot.features.learning')
      ],
      technologies: ['OpenAI', 'Python', 'React', 'WebSockets'],
    },
    {
      icon: Zap,
      title: t('services.integrations.title'),
      description: t('services.integrations.description'),
      features: [
        t('services.integrations.features.calendar'),
        t('services.integrations.features.payment'),
        t('services.integrations.features.crm'),
        t('services.integrations.features.api'),
        t('services.integrations.features.webhook'),
        t('services.integrations.features.thirdParty')
      ],
      technologies: ['REST API', 'GraphQL', 'OAuth', 'Stripe'],
    },
  ];

  const additionalServices = [
    {
      icon: Clock,
      title: t('services.additional.timeManagement.title'),
      description: t('services.additional.timeManagement.description'),
    },
    {
      icon: Shield,
      title: t('services.additional.security.title'),
      description: t('services.additional.security.description'),
    },
    {
      icon: Smartphone,
      title: t('services.additional.mobile.title'),
      description: t('services.additional.mobile.description'),
    },
    {
      icon: Globe,
      title: t('services.additional.multiLanguage.title'),
      description: t('services.additional.multiLanguage.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-background via-white to-background relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('services.title')} <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">{t('services.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              {t('services.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-32">
            {mainServices.map((service, index) => {
              const Icon = service.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:grid-flow-dense' : ''}`}>
                  <div className={isEven ? '' : 'lg:col-start-2'}>
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center mr-4 hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900">{service.title}</h2>
                    </div>
                    <p className="text-lg text-gray-700 mb-8 leading-relaxed">{service.description}</p>
                    
                    <div className="mb-8">
                      <h3 className="font-semibold text-gray-900 mb-4 text-lg">What's Included:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {service.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center hover:-translate-y-1 transition-all duration-200">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="font-semibold text-gray-900 mb-4 text-lg">Technologies:</h3>
                      <div className="flex flex-wrap gap-2">
                        {service.technologies.map((tech, techIndex) => (
                          <span key={techIndex} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:scale-105 transition-transform duration-200">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${!isEven ? 'lg:col-start-1 lg:row-start-1' : ''} relative`}>
                    <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-8 transform hover:scale-105 transition-transform duration-300 shadow-2xl">
                      <div className="bg-white rounded-xl p-6 shadow-2xl">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                            <Icon className="h-16 w-16 text-primary animate-pulse" />
                          </div>
                          <div className="flex space-x-2">
                            <div className="flex-1 h-8 bg-primary rounded hover:scale-105 transition-transform"></div>
                            <div className="flex-1 h-8 bg-primary-light rounded hover:scale-105 transition-transform"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Additional Features
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Complete your appointment management with our complementary features.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div 
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-primary/20"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-700">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Process
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              A proven methodology that ensures successful implementation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Discovery', description: 'Understanding your business and requirements' },
              { step: '02', title: 'Setup', description: 'Configuring your account and preferences' },
              { step: '03', title: 'Integration', description: 'Connecting with your existing tools' },
              { step: '04', title: 'Launch', description: 'Going live with ongoing support' },
            ].map((phase, index) => (
              <div 
                key={index}
                className="text-center transition-all duration-300 hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform shadow-lg">
                  <span className="text-white font-bold text-lg">{phase.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{phase.title}</h3>
                <p className="text-gray-700">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-light text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Let's talk about how Appointly-ks can help streamline your appointment booking process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 inline-flex items-center justify-center group hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
