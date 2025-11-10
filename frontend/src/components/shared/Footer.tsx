import React from 'react';
import { MapPin, Phone, Mail, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom'; 

const Footer: React.FC = () => {
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4"/>
                <path d="M8 2v4"/>
                <path d="M3 10h18"/>
                <path d="M9.5 16l2 2l4-4"/>
              </svg>
              <span className="text-2xl font-extrabold">Appointly-ks</span>
            </div>
            <p className="text-gray-400 text-sm">
              Making appointment booking simple and convenient for both businesses and customers.
            </p>
            <div className="flex space-x-4">
              {/* <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={20} />
              </a> */}
              {/* <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a> */}
              <a href="https://www.tiktok.com/@appointlykosova" className="text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/appointlyks/" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com/company/appointly-ks" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 flex flex-col justify-center items-center">
            <h3 className="text-lg font-semibold text-start">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin size={18} className="text-gray-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <span className="text-gray-400 block">Prishtina</span>
                  <span className="text-gray-400 block">10000</span>
                  <span className="text-gray-400 block">Prishtina, Kosovo</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone size={18} className="text-gray-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <a href="tel:+383 45 378 957" className="text-gray-400 hover:text-white transition-colors block">
                    +383 45 378 957
                  </a>
                  <span className="text-gray-400 text-sm block">Mon-Fri, 9am-6pm CET</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail size={18} className="text-gray-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <a href="mailto:etrithasolli5@gmail.com" className="text-gray-400 hover:text-white transition-colors block">
                    Etrit Hasolli
                  </a>
                  <a href="mailto:lerdi890@gmail.com" className="text-gray-400 hover:text-white transition-colors block">
                  Lerdi Salihi
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* More Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">More Information</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-white transition-colors">Services</Link>
              </li>
              
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
              </li>
            </ul>
          </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Appointly-ks. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 space-x-6">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</Link>
              <Link to="/cookie-policy" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </footer>
  );
};

export default Footer;
