import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const CookiePolicy: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('cookies.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('cookies.title')}</h1>
          <p className="text-muted mb-8">{t('cookies.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s1.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('cookies.sections.s1.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s2.title')}</h2>
              <div className="bg-surface p-5 rounded-xl border border-gray-100 mb-4">
                <h3 className="text-lg font-semibold text-navy-800 mb-3">{t('cookies.sections.s2.essentialTitle')}</h3>
                <p className="text-navy-800 mb-3 text-sm leading-relaxed">{t('cookies.sections.s2.essentialDesc')}</p>
                <ul className="list-disc list-inside text-navy-800 space-y-2 ml-2">
                  {(t('cookies.sections.s2.essentialItems', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                    <li key={i}>
                      <strong>{item.name}</strong>
                      <p className="text-muted text-sm ml-6 mt-1">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface p-5 rounded-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-navy-800 mb-3">{t('cookies.sections.s2.preferenceTitle')}</h3>
                <p className="text-navy-800 mb-3 text-sm leading-relaxed">{t('cookies.sections.s2.preferenceDesc')}</p>
                <ul className="list-disc list-inside text-navy-800 space-y-2 ml-2">
                  {(t('cookies.sections.s2.preferenceItems', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                    <li key={i}>
                      <strong>{item.name}</strong>
                      <p className="text-muted text-sm ml-6 mt-1">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s3.title')}</h2>
              <p className="text-navy-800 mb-4 leading-relaxed">{t('cookies.sections.s3.intro')}</p>
              <div className="space-y-4">
                {(t('cookies.sections.s3.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <div key={i} className="bg-surface p-4 rounded-xl border border-gray-100">
                    <h4 className="font-semibold text-navy-800 mb-2">{item.name}</h4>
                    <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s4.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('cookies.sections.s4.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('cookies.sections.s4.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('cookies.sections.s4.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s5.title')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">{t('cookies.sections.s5.sessionTitle')}</h3>
                  <p className="text-navy-800 leading-relaxed">{t('cookies.sections.s5.sessionContent')}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">{t('cookies.sections.s5.preferenceTitle')}</h3>
                  <p className="text-navy-800 leading-relaxed">{t('cookies.sections.s5.preferenceContent')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s6.title')}</h2>
              <h3 className="text-lg font-semibold text-navy-800 mb-2">{t('cookies.sections.s6.clearingTitle')}</h3>
              <p className="text-navy-800 mb-4 leading-relaxed">{t('cookies.sections.s6.clearingIntro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mb-4">
                {(t('cookies.sections.s6.clearingItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-lg font-semibold text-navy-800 mb-2">{t('cookies.sections.s6.browserTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('cookies.sections.s6.browserIntro')}</p>
              <div className="bg-surface p-4 rounded-xl border border-gray-100">
                <ul className="list-disc list-inside text-navy-800 space-y-2 text-sm">
                  {(t('cookies.sections.s6.browserItems', { returnObjects: true }) as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s7.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('cookies.sections.s7.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('cookies.sections.s7.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('cookies.sections.s7.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s8.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('cookies.sections.s8.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s9.title')}</h2>
              <p className="text-navy-800 leading-relaxed">
                {t('cookies.sections.s9.content')}{' '}
                <Link to="/privacy-policy" className="text-primary hover:text-accent">{t('privacy.title')}</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('cookies.sections.s10.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('cookies.sections.s10.intro')}</p>
              <div className="mt-4 p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-navy-800"><strong>{t('cookies.sections.s10.emailLabel')}</strong> <a href="mailto:info@appointly-ks.com" className="text-primary hover:text-accent">info@appointly-ks.com</a></p>
                <p className="text-navy-800 mt-1"><strong>{t('cookies.sections.s10.addressLabel')}</strong> Prishtina, Kosovo</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CookiePolicy;
