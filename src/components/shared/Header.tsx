import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Users, Settings, LogOut, User } from 'lucide-react';
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
      <header className="bg-white shadow-sm">
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
                className="h-14 w-auto mr-4"
                src="https://dvbgblopuepbisvdgyci.supabase.co/storage/v1/object/public/logos/Appointly%20Logo.png"
                alt="Appointly-ks logo"
                
              />
              <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out transform translate-x-4 group-hover:translate-x-0">Appointly-ks</span>
            </button>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
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
                      style={{ animationDelay: '800ms' }}
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
                      style={{ animationDelay: '400ms' }}
                    >
                      <User className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium">Business Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        logout();
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
            ) : currentView === 'customer' ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/login')}
                  className="ml-2 border-2 border-slate-600 text-slate-700 hover:bg-slate-600 hover:text-white"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/register')}
                  className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
                >
                  Register as a business
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
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
      {/* Mobile menu, show/hide based on menu state */}
      {menuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {user ? (
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="ghost" 
                  fullWidth
                  onClick={() => {
                    navigate('/dashboard');
                    setMenuOpen(false);
                  }}
                  className="text-lg font-semibold"
                >
                  Dashboard
                </Button>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/dashboard')}
                    className="text-lg font-semibold"
                  >
                    Dashboard
                  </Button>
                  <div onClick={() => navigate('/profile')} style={{cursor: 'pointer'}}>
                    {user.logo ? (
                      <img
                        src={user.logo}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{user.name}</span>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="ml-4 p-2 text-gray-600 hover:text-red-500 transition-colors duration-200"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : currentView === 'customer' ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                  className="mt-2 border-2 border-slate-600 text-slate-700 hover:bg-slate-600 hover:text-white"
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
                  className="mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
                >
                  Register
                </Button>
              </>
            ) : (
                              <Button 
                  variant="ghost" 
                  fullWidth
                  onClick={() => {
                    navigate('/dashboard');
                    setMenuOpen(false);
                  }}
                  className="text-lg font-semibold"
                >
                  Dashboard
                </Button>
            )}
          </div>
        </div>
      )}
    </header>
    </>
  );
};

export default Header;
