import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('i18nextLng', languageCode);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-colors duration-200 text-steel-300 text-sm font-medium"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4 shrink-0 text-steel-300" />
        <span className="tabular-nums">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-steel-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-navy-900/95 backdrop-blur-xl rounded-lg shadow-ghost-xl border border-white/[0.08] py-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors duration-150 ${
                currentLanguage.code === language.code ? 'bg-accent/15 text-accent' : 'text-steel-200 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{language.name}</span>
              </div>
              {currentLanguage.code === language.code && (
                <Check className="h-4 w-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
