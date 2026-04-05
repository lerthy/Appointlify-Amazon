import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-surface via-white to-surface">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-primary hover:text-accent transition-colors mb-6">
            <ArrowLeft size={20} className="mr-2" />
            {t('terms.backToHome')}
          </Link>
          
          <h1 className="text-4xl font-bold text-navy-900 mb-4">{t('terms.title')}</h1>
          <p className="text-muted mb-8">{t('terms.lastUpdated')}: April 5, 2026</p>

          <div className="bg-white rounded-2xl shadow-ghost-lg border border-gray-100 p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s1.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s1.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s2.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s2.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4 mt-3">
                {(t('terms.sections.s2.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s3.title')}</h2>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">{t('terms.sections.s3.registrationTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s3.registrationIntro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s3.registrationItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('terms.sections.s3.accountTypesTitle')}</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                <li>{t('terms.sections.s3.businessAccount')}</li>
                <li>{t('terms.sections.s3.guestBooking')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s4.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s4.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s4.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">
                <strong>Note:</strong> {t('terms.sections.s4.note')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s5.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s5.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s5.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s6.title')}</h2>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">{t('terms.sections.s6.forBusinessesTitle')}</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s6.forBusinessesItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-6">{t('terms.sections.s6.forCustomersTitle')}</h3>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s6.forCustomersItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s7.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s7.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s7.items', { returnObjects: true }) as Array<{ name: string; desc: string }>).map((item, i) => (
                  <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('terms.sections.s7.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s8.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s8.content1')}</p>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s8.content2')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s9.title')}</h2>
              <p className="text-navy-800 leading-relaxed">
                {t('terms.sections.s9.content')}{' '}
                <Link to="/privacy-policy" className="text-primary hover:text-accent">{t('privacy.title')}</Link>{' '}{t('common.and')}{' '}
                <Link to="/cookie-policy" className="text-primary hover:text-accent">{t('cookies.title')}</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s10.title')}</h2>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">{t('terms.sections.s10.asIsTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s10.asIsContent')}</p>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">{t('terms.sections.s10.platformTitle')}</h3>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s10.platformIntro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s10.platformItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold text-navy-800 mb-2 mt-4">{t('terms.sections.s10.limitationTitle')}</h3>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s10.limitationContent')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s11.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s11.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s12.title')}</h2>
              <p className="text-navy-800 mb-3 leading-relaxed">{t('terms.sections.s12.intro')}</p>
              <ul className="list-disc list-inside text-navy-800 space-y-2 ml-4">
                {(t('terms.sections.s12.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-navy-800 mt-3 leading-relaxed">{t('terms.sections.s12.note')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s13.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s13.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s14.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s14.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mb-3">{t('terms.sections.s15.title')}</h2>
              <p className="text-navy-800 leading-relaxed">{t('terms.sections.s15.intro')}</p>
              <div className="mt-4 p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-navy-800"><strong>{t('terms.sections.s15.emailLabel')}</strong> <a href="mailto:info@appointly-ks.com" className="text-primary hover:text-accent">info@appointly-ks.com</a></p>
                <p className="text-navy-800 mt-1"><strong>{t('terms.sections.s15.addressLabel')}</strong> Prishtina, Kosovo</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
