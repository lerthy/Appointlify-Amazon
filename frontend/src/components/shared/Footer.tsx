import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom'; 

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Company Info */}
            <div className="space-y-5 flex flex-col items-center text-center md:items-start md:text-left">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4"/>
                  <path d="M8 2v4"/>
                  <path d="M3 10h18"/>
                  <path d="M9.5 16l2 2l4-4"/>
                </svg>
                <span className="text-2xl font-extrabold">Appointly-ks</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                {t('footer.companyDescription')}
              </p>
              <div className="flex items-center gap-3">
                <a href="https://www.tiktok.com/@appointlykosova" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/appointlyks/" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <Instagram size={16} />
                </a>
                <a href="https://linkedin.com/company/appointly-ks" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <Linkedin size={16} />
                </a>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-5 flex flex-col items-center text-center md:items-start md:text-left">
              <h3 className="text-base font-semibold text-white">{t('footer.contactUs')}</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={14} className="text-gray-400" />
                  </div>
                  <div className="text-gray-400 text-sm">
                    <span className="block">Prishtina, 10000</span>
                    <span className="block">Kosovo</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <a href="tel:+383 45 378 957" className="text-gray-400 hover:text-white transition-colors text-sm block">
                      +383 45 378 957
                    </a>
                    <span className="text-gray-500 text-xs block">{t('footer.monFri')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <a href="mailto:etrithasolli5@gmail.com" className="text-gray-400 hover:text-white transition-colors text-sm block">
                      Etrit Hasolli
                    </a>
                    <a href="mailto:lerdi890@gmail.com" className="text-gray-400 hover:text-white transition-colors text-sm block">
                      Lerdi Salihi
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            {/* More Information */}
            <div className="space-y-5 flex flex-col items-center text-center md:items-start md:text-left">
              <h3 className="text-base font-semibold text-white">{t('footer.moreInfo')}</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-gray-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-accent/60 group-hover:bg-accent transition-colors"></span>
                    {t('footer.aboutUs')}
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="text-gray-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-accent/60 group-hover:bg-accent transition-colors"></span>
                    {t('footer.services')}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-accent/60 group-hover:bg-accent transition-colors"></span>
                    {t('footer.contact')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center text-center gap-4">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Appointly-ks. {t('footer.allRightsReserved')}
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link to="/privacy-policy" className="text-gray-500 hover:text-white text-sm transition-colors">{t('footer.privacyPolicy')}</Link>
                <Link to="/terms-of-service" className="text-gray-500 hover:text-white text-sm transition-colors">{t('footer.termsOfService')}</Link>
                <Link to="/cookie-policy" className="text-gray-500 hover:text-white text-sm transition-colors">{t('footer.cookiePolicy')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
