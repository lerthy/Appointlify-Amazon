import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, Shield } from 'lucide-react';

interface SplitAuthLayoutProps {
  logoUrl: string;
  title: string;
  subtitle: string;
  quote?: string;
  children: React.ReactNode;
  reverse?: boolean;
}

const SplitAuthLayout: React.FC<SplitAuthLayoutProps> = ({ title, subtitle, quote, children, reverse }) => {
  const navigate = useNavigate();
  return (
    <div className={`min-h-screen flex md:flex-row ${reverse ? 'md:flex-row-reverse' : ''} bg-background`}>
      {/* Branding Side */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-accent/8 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[20%] right-[5%] w-80 h-80 bg-steel-400/8 rounded-full blur-3xl"></div>
          <div className="absolute top-[60%] left-[40%] w-48 h-48 bg-white/[0.02] rounded-full blur-2xl"></div>
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />
        </div>
        
        {/* Top - Brand */}
        <div className="relative z-10 pt-10 px-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <img src="/logo-white.png" alt="Appointly" className="h-9 group-hover:opacity-90 transition-opacity" />
            <span className="text-xl font-bold text-white tracking-tight group-hover:text-white/90 transition-colors">Appointly-ks</span>
          </button>
        </div>
        
        {/* Center - Content */}
        <div className="relative z-10 flex flex-col items-start px-10 lg:px-14">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-5 tracking-tight">{title}</h1>
          <p className="text-lg text-steel-300 mb-8 leading-relaxed max-w-md">{subtitle}</p>
          
          {quote && (
            <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06] max-w-md">
              <p className="text-steel-200 italic text-base leading-relaxed">"{quote}"</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-accent rounded-full"></div>
                <span className="text-accent text-sm font-medium">Appointly Team</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom - Trust indicators */}
        <div className="relative z-10 px-10 pb-10">
          <div className="flex flex-wrap items-center gap-6 text-steel-400/60 text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col w-full md:w-1/2 px-4 py-10 md:py-8 bg-gradient-to-br from-surface via-white to-surface/80 relative">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg px-6 py-8 sm:px-8 sm:py-10 relative">
            {/* Mobile header */}
            <div className="md:hidden flex flex-col items-center text-center mb-8 space-y-3">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-2">
                <img src="/logo-white.png" alt="Appointly" className="h-8" />
                <span className="text-xl font-bold text-primary">Appointly-ks</span>
              </button>
              <h1 className="text-xl font-extrabold text-navy-900">{title}</h1>
              <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitAuthLayout;
