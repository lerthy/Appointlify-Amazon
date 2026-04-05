import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogOut, User, HeartHandshake, Briefcase, LayoutDashboard, Home, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef<number>(0);
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const scrollingUp = currentY < lastY;
      setIsScrollingUp(scrollingUp || currentY < 10);
      setIsScrolled(currentY > 20);
      if (!scrollingUp && menuOpen) setMenuOpen(false);
      lastScrollYRef.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuOpen]);

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };
  
  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrollingUp ? 'translate-y-0' : '-translate-y-full'} ${isScrolled ? 'bg-navy-950/95 backdrop-blur-xl shadow-ghost-md border-b border-white/[0.06]' : 'bg-navy-950'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                className="group flex-shrink-0 flex items-center focus:outline-none"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => navigate('/')}
                type="button"
              >
                <img
                  className="h-9 mr-0 sm:mr-3"
                  src="/logo-white.png"
                  alt="Appointly logo"
                />
                <span className="hidden sm:inline text-xl font-bold text-white tracking-tight">
                  Appointly-ks
                </span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:items-center sm:gap-1">
              {user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white hover:text-steel-300 rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                  >
                    <CreditCard className="h-4 w-4" />
                    {t('header.pricing')}
                  </button>
                  <LanguageSelector />
                  <div className="w-px h-5 bg-white mx-1" />

                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={toggleDropdown}
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen}
                      className={`p-2 rounded-lg transition-all duration-200 ${dropdownOpen ? 'bg-white/10 text-white' : 'hover:bg-white/[0.06] text-white'}`}
                    >
                      {dropdownOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    {dropdownOpen && (
                      <div
                        className="absolute right-0 top-full mt-1.5 w-56 py-1.5 rounded-xl border border-white/[0.08] bg-navy-900/95 backdrop-blur-xl shadow-ghost-xl z-[60] flex flex-col origin-top-right"
                        role="menu"
                      >
                        {location.pathname !== '/' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { navigate('/'); setDropdownOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-white w-full text-left transition-colors"
                          >
                            <Home className="h-4 w-4 shrink-0" />
                            {t('header.home')}
                          </button>
                        )}
                        {location.pathname !== '/dashboard' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { navigate('/dashboard'); setDropdownOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-white w-full text-left transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 shrink-0" />
                            {t('header.dashboard')}
                          </button>
                        )}
                        {location.pathname !== '/profile' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-white w-full text-left transition-colors"
                          >
                            <User className="h-4 w-4 shrink-0" />
                            {t('header.businessProfile')}
                          </button>
                        )}
                        <div className="my-1 border-t border-white/[0.06]" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { logout(() => navigate('/')); setDropdownOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 w-full text-left transition-colors"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          {t('header.signOut')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => scrollToSection('businesses-section')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-steel-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    {t('header.forBusinesses')}
                  </button>
                  <button
                    onClick={() => scrollToSection('clients-section')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-steel-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    {t('header.forClients')}
                  </button>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white hover:text-accent rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                  >
                    <CreditCard className="h-4 w-4" />
                    {t('header.pricing')}
                  </button>
                  
                  <div className="w-px h-5 bg-white mx-2"></div>
                  
                  <LanguageSelector />
                  
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2 text-sm font-semibold text-steel-200 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 hover:bg-white/[0.06]"
                  >
                    {t('header.login')}
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="ml-1 px-5 py-2 text-sm font-semibold text-white bg-accent hover:bg-steel-400 rounded-xl transition-all duration-300 shadow-ghost"
                  >
                    {t('header.register')}
                  </button>
                </>
              )}
            </div>

            {/* Mobile quick actions + menu button */}
            <div className="flex items-center gap-2 sm:hidden">
              {isHome && (
                <>
                  <button
                    onClick={() => scrollToSection('businesses-section')}
                    className="flex items-center gap-1 text-xs font-semibold text-steel-300 px-2.5 py-1.5 rounded-lg bg-white/[0.06]"
                  >
                    <Briefcase className="h-3 w-3" />
                    <span>{t('header.forBusinesses')}</span>
                  </button>
                  <button
                    onClick={() => scrollToSection('clients-section')}
                    className="flex items-center gap-1 text-xs font-semibold text-steel-300 px-2.5 py-1.5 rounded-lg bg-white/[0.06]"
                  >
                    <HeartHandshake className="h-3 w-3" />
                    <span>{t('header.forClients')}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="p-2 rounded-lg text-steel-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                onClick={toggleMenu}
              >
                <span className="sr-only">{t('header.openMenu')}</span>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        <div
          className={`sm:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 z-40 ${menuOpen && isScrollingUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Mobile side drawer */}
        <div className={`sm:hidden fixed top-16 right-0 w-64 h-[calc(100vh-64px)] bg-navy-900 shadow-2xl border-l border-white/[0.06] transform transition-transform duration-300 z-50 ${menuOpen && isScrollingUp ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="pt-6 pb-10 px-5 space-y-1 overflow-y-auto h-full">
            {user ? (
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => { navigate('/'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-steel-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <Home className="h-4 w-4" />
                  {t('header.home')}
                </button>
                <button
                  onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-steel-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('header.dashboard')}
                </button>
                <button
                  onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-steel-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <User className="h-4 w-4" />
                  {t('header.profile')}
                </button>
                <div className="h-px bg-white/[0.06] my-2"></div>
                <button
                  onClick={() => { logout(() => navigate('/')); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  {t('header.signOut')}
                </button>
                <div className="pt-3 border-t border-white/[0.06] mt-2">
                  <LanguageSelector />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => { navigate('/'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-steel-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <Home className="h-4 w-4" />
                  {t('header.home')}
                </button>
                <button
                  onClick={() => { navigate('/pricing'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-steel-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <CreditCard className="h-4 w-4" />
                  {t('header.pricing')}
                </button>
                <div className="h-px bg-white/[0.06] my-2"></div>
                <button
                  onClick={() => { navigate('/login'); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-sm font-semibold text-steel-200 border border-white/10 hover:border-white/20 rounded-xl transition-all text-center"
                >
                  {t('header.login')}
                </button>
                <button
                  onClick={() => { navigate('/register'); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-sm font-semibold text-white bg-accent hover:bg-steel-400 rounded-xl transition-all text-center"
                >
                  {t('header.register')}
                </button>
                <div className="pt-3 border-t border-white/[0.06] mt-2">
                  <LanguageSelector />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Spacer */}
      <div className="h-16"></div>
    </>
  );
};

export default Header;
