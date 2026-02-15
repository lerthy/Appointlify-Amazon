import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslation from './locales/en.json';
import sqTranslation from './locales/sq.json';

const resources = {
  en: {
    translation: enTranslation
  },
  sq: {
    translation: sqTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'sq', // Albanian as default
    lng: 'sq', // Force Albanian as initial language
    debug: false,
    interpolation: {
      escapeValue: false // React already safes from XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

// Set Albanian as default if no language is stored
if (!localStorage.getItem('i18nextLng')) {
  localStorage.setItem('i18nextLng', 'sq');
  i18n.changeLanguage('sq');
}

export default i18n;
