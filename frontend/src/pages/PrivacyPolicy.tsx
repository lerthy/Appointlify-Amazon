import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('privacy.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('privacy.title')}</h1>
          <p className="text-muted mb-8">{t('privacy.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s1.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s1.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s2.title')}</h2>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">{t('privacy.sections.s2.businessTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s2.businessDesc')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s2.businessItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('privacy.sections.s2.employeeTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s2.employeeDesc')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s2.employeeItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('privacy.sections.s2.customerTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s2.customerDesc')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s2.customerItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('privacy.sections.s2.googleTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s2.googleDesc')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s2.googleItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('privacy.sections.s2.autoTitle')}</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s2.autoItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s3.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s3.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s3.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s4.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s4.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s4.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('privacy.sections.s4.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s5.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s5.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s5.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 font-medium">{t('privacy.sections.s5.noSell')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s6.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s6.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                {(t('privacy.sections.s6.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('privacy.sections.s6.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s7.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s7.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                {(t('privacy.sections.s7.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <li key={i}>
                    <strong>{item.name}</strong>
                    <p className="text-muted text-sm ml-6 mt-1">{item.desc}</p>
                  </li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                {t('privacy.sections.s7.note')}{' '}
                <Link to="/cookie-policy" className="text-primary hover:text-accent">{t('cookies.title')}</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s8.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('privacy.sections.s8.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('privacy.sections.s8.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                {t('privacy.sections.s8.contactInfo')} <a href="mailto:info@appointly-ks.com" className="text-primary hover:text-accent">info@appointly-ks.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s9.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s9.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s10.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s10.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s11.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s11.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('privacy.sections.s12.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('privacy.sections.s12.intro')}</p>
              <div className="mt-4 p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-navy-800"><strong>{t('privacy.sections.s12.emailLabel')}</strong> <a href="mailto:info@appointly-ks.com" className="text-primary hover:text-accent">info@appointly-ks.com</a></p>
                <p className="text-navy-800 mt-1"><strong>{t('privacy.sections.s12.addressLabel')}</strong> Prishtina, Kosovo</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
