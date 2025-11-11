import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Users, Settings, LogOut, User, UserCheck, HeartHandshake, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { businessSettings, currentView, setCurrentView } = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const lastScrollYRef = useRef<number>(0);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  
  const toggleView = () => {
    setCurrentView(currentView === 'customer' ? 'business' : 'customer');
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);
  
  // Detect scroll direction to control mobile menu visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const scrollingUp = currentY < lastY;
      setIsScrollingUp(scrollingUp || currentY < 10);
      // Hide mobile menu while scrolling down
      if (!scrollingUp && menuOpen) {
        setMenuOpen(false);
      }
      lastScrollYRef.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuOpen]);
  
  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .animate-slideInRight {
            animation: slideInRight 0.4s ease-out forwards;
            opacity: 0;
          }
        `}
      </style>
      <header className={`bg-white shadow-sm fixed top-0 inset-x-0 z-50 transition-transform duration-300 ${isScrollingUp ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex">
            <button
              className="group flex-shrink-0 flex items-center focus:outline-none"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="Go to homepage"
              onClick={() => navigate('/')}
              type="button"
            >
              <img
                className="h-12 mr-0 sm:mr-4"
                src="https://dvbgblopuepbisvdgyci.supabase.co/storage/v1/object/public/logos/Appointly%20Logo.png"
                alt="Appointly-ks logo"
                
              />
              <span className="hidden sm:inline text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent opacity-100">
                Appointly-ks
              </span>
            </button>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-3">
            {user ? (
              <div className="flex items-center space-x-4" ref={dropdownRef}>
                {/* Animated Tabs */}
                {dropdownOpen && (
                  <>
                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all duration-300 ease-out animate-slideInRight opacity-0"
                      style={{ animationDelay: '200ms' }}
                    >
                      <Users className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">Dashboard</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all duration-300 ease-out animate-slideInRight opacity-0"
                      style={{ animationDelay: '100ms' }}
                    >
                      <User className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">Business Profile</span>
                    </button>
                    
                    <button
                        onClick={() => {
                          logout(() => navigate('/'));
                          setDropdownOpen(false);
                        }}
                      className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 ease-out animate-slideInRight opacity-0"
                      style={{ animationDelay: '0ms' }}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </>
                )}
                
                {/* Hamburger Button */}
                <button
                  onClick={toggleDropdown}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <Menu className="h-8 w-8 text-gray-600" />
                </button>
              </div>
            ) : (
              <>
                {/* Clear Navigation for Both User Types */}
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    if (window.location.pathname === '/') {
                      document.getElementById('businesses-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('businesses-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="text-gray-700 hover:text-purple-600 font-semibold"
                >
                  <Briefcase className="h-5 w-5 mr-1" />
                  For Businesses
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    if (window.location.pathname === '/') {
                      document.getElementById('clients-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('clients-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="text-gray-700 hover:text-blue-600 font-semibold"
                >
                  <HeartHandshake className="h-5 w-5 mr-1" />
                  For Clients
                </Button>
                
                <div className="border-l border-gray-300 h-8 mx-2"></div>
                
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/login')}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 focus:!ring-0 focus:!ring-offset-0 focus:!outline-none"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/register')}
                  className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 outline-none focus:!ring-0 focus:!ring-offset-0 focus:!outline-none"
                >
                  Register
                </Button>
              </>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={toggleMenu}
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile overlay */}
      <div
        className={`sm:hidden fixed inset-0 top-20 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 z-40 ${menuOpen && isScrollingUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Mobile side drawer */}
      <div className={`sm:hidden fixed top-20 right-0 w-56 max-w-[14rem] h-[calc(100vh-80px)] bg-white shadow-2xl border-l border-gray-100 transform transition-transform duration-300 z-50 ${menuOpen && isScrollingUp ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="pt-6 pb-10 px-4 space-y-2 overflow-y-auto h-full">
            {user ? (
              <div className="flex flex-col space-y-2">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    navigate('/');
                    setMenuOpen(false);
                  }}
                  className="text-base font-semibold justify-start hover:bg-transparent hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600"
                >
                  Home
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    navigate('/dashboard');
                    setMenuOpen(false);
                  }}
                  className="text-base font-semibold justify-start hover:bg-transparent hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600"
                  fullWidth
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                  className="text-base font-semibold justify-start hover:bg-transparent hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600"
                  fullWidth
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    logout(() => navigate('/'));
                    setMenuOpen(false);
                  }}
                  className="text-base font-semibold justify-start text-red-600 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600 hover:bg-transparent"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    navigate('/');
                    setMenuOpen(false);
                  }}
                  className="text-base font-semibold justify-start hover:bg-transparent hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600"
                >
                  Home
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    if (window.location.pathname === '/') {
                      document.getElementById('businesses-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('businesses-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                    setMenuOpen(false);
                  }}
                  className="mt-2 border-2 border-purple-600 text-purple-700 hover:bg-purple-600 hover:text-white font-semibold"
                >
                  <Users className="h-5 w-5 mr-2" />
                  For Businesses
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    if (window.location.pathname === '/') {
                      document.getElementById('clients-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('clients-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                    setMenuOpen(false);
                  }}
                  className="mt-2 border-2 border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold"
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  For Clients
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                  className="mt-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    navigate('/register');
                    setMenuOpen(false);
                  }}
                  className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 font-semibold"
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
    </header>
    {/* Spacer to offset fixed header height */}
    <div className="h-20"></div>
    </>
  );
};

export default Header;
