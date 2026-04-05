import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Zap, Crown, ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const plans = [
    {
      key: 'free',
      icon: Sparkles,
      price: '0',
      popular: false,
      features: [
        { key: 'appointments', included: true },
        { key: 'employees', included: true },
        { key: 'basicDashboard', included: true },
        { key: 'emailReminders', included: false },
        { key: 'smsReminders', included: false },
        { key: 'analytics', included: false },
        { key: 'prioritySupport', included: false },
        { key: 'customBranding', included: false },
      ],
    },
    {
      key: 'starter',
      icon: Zap,
      price: '9.99',
      popular: true,
      features: [
        { key: 'appointmentsUnlimited', included: true },
        { key: 'employeesUp5', included: true },
        { key: 'fullDashboard', included: true },
        { key: 'emailReminders', included: true },
        { key: 'smsReminders', included: false },
        { key: 'basicAnalytics', included: true },
        { key: 'prioritySupport', included: false },
        { key: 'customBranding', included: false },
      ],
    },
    {
      key: 'professional',
      icon: Crown,
      price: '24.99',
      popular: false,
      features: [
        { key: 'appointmentsUnlimited', included: true },
        { key: 'employeesUnlimited', included: true },
        { key: 'fullDashboard', included: true },
        { key: 'emailReminders', included: true },
        { key: 'smsReminders', included: true },
        { key: 'advancedAnalytics', included: true },
        { key: 'prioritySupport', included: true },
        { key: 'customBranding', included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950/[0.02] via-transparent to-accent/[0.03]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.p
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6"
                variants={fadeUp}
              >
                <Sparkles className="w-4 h-4" />
                {t('pricing.badge')}
              </motion.p>
              
              <motion.h1
                className="text-4xl sm:text-5xl font-bold text-navy-900 mb-4"
                variants={fadeUp}
              >
                {t('pricing.title')}
              </motion.h1>
              
              <motion.p
                className="text-lg text-muted max-w-2xl mx-auto"
                variants={fadeUp}
              >
                {t('pricing.subtitle')}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 sm:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              {plans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.key}
                    variants={fadeUp}
                    className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-300 ${
                      plan.popular
                        ? 'bg-navy-950 text-white shadow-ghost-xl scale-[1.02] border-2 border-accent'
                        : 'bg-white border border-gray-200 shadow-ghost hover:shadow-ghost-lg hover:border-primary/20'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-white text-xs font-semibold">
                          <Zap className="w-3 h-3" />
                          {t('pricing.mostPopular')}
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                        plan.popular ? 'bg-white/10' : 'bg-primary/10'
                      }`}>
                        <Icon className={`w-6 h-6 ${plan.popular ? 'text-accent' : 'text-primary'}`} />
                      </div>
                      
                      <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-navy-900'}`}>
                        {t(`pricing.plans.${plan.key}.name`)}
                      </h3>
                      
                      <p className={`text-sm ${plan.popular ? 'text-steel-300' : 'text-muted'}`}>
                        {t(`pricing.plans.${plan.key}.description`)}
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-navy-900'}`}>
                          €{plan.price}
                        </span>
                        <span className={`text-sm ${plan.popular ? 'text-steel-400' : 'text-muted'}`}>
                          /{t('pricing.perMonth')}
                        </span>
                      </div>
                      {plan.key === 'free' && (
                        <p className="mt-2 text-sm text-accent font-medium">
                          {t('pricing.freeTrial')}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature.key} className="flex items-start gap-3">
                          {feature.included ? (
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              plan.popular ? 'bg-accent/20' : 'bg-green-100'
                            }`}>
                              <Check className={`w-3 h-3 ${plan.popular ? 'text-accent' : 'text-green-600'}`} />
                            </div>
                          ) : (
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              plan.popular ? 'bg-white/10' : 'bg-gray-100'
                            }`}>
                              <X className={`w-3 h-3 ${plan.popular ? 'text-steel-500' : 'text-gray-400'}`} />
                            </div>
                          )}
                          <span className={`text-sm ${
                            feature.included
                              ? plan.popular ? 'text-white' : 'text-navy-800'
                              : plan.popular ? 'text-steel-500' : 'text-gray-400'
                          }`}>
                            {t(`pricing.features.${feature.key}`)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      disabled
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 cursor-not-allowed opacity-60 ${
                        plan.popular
                          ? 'bg-accent text-white'
                          : 'bg-navy-950 text-white'
                      }`}
                    >
                      {t('pricing.comingSoon')}
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Note */}
            <motion.div
              className="mt-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-muted text-sm max-w-2xl mx-auto">
                {t('pricing.note')}
              </p>
            </motion.div>

            {/* Back to Home */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('pricing.backToHome')}
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
