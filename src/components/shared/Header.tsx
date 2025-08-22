import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Users, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { businessSettings, currentView, setCurrentView } = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { user, logout } = useAuth();
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const toggleView = () => {
    setCurrentView(currentView === 'customer' ? 'business' : 'customer');
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex">
            <button
              className="flex-shrink-0 flex items-center focus:outline-none"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="Go to homepage"
              onClick={() => navigate('/')}
              type="button"
            >
              <img
                className="h-16 w-auto mr-4"
                src="https://ijdizbjsobnywmspbhtv.supabase.co/storage/v1/object/public/issues//logopng1324.png"
                alt="Appointly-ks logo"
                
              />
              <span className="text-3xl font-extrabold text-gray-900">Appointly-ks</span>
            </button>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <nav className="flex space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/dashboard')}
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
                  <Button
                    variant="outline"
                    className="ml-4"
                    onClick={logout}
                  >
                    Sign Out
                  </Button>
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
            </nav>
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
                >
                  Dashboard
                </Button>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/dashboard')}
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
                  <Button
                    variant="outline"
                    className="ml-4"
                    onClick={logout}
                  >
                    Sign Out
                  </Button>
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
              >
                Dashboard
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
