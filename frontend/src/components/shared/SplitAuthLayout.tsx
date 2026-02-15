import React from 'react';

interface SplitAuthLayoutProps {
  logoUrl: string;
  title: string;
  subtitle: string;
  quote?: string;
  children: React.ReactNode;
  reverse?: boolean;
}

// Office/appointment/collaboration Unsplash image
const APPOINTMENT_BG = 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80';

const SplitAuthLayout: React.FC<SplitAuthLayoutProps> = ({ title, subtitle, quote, children, reverse }) => {
  return (
    <div className={`min-h-screen flex  md:flex-row ${reverse ? 'md:flex-row-reverse' : ''} bg-gradient-to-br from-slate-50 via-white to-background`}>
      {/* Left or Right Side (text only) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-slate-600 via-primary to-primary-light relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${APPOINTMENT_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary-light/50 to-slate-700/40" />
        
        {/* Appointly-KS at top */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <h3 className="text-2xl font-extrabold text-white text-center drop-shadow-lg tracking-wider">
            Appointly
          </h3>
        </div>
        
        <div className="relative z-10 flex flex-col items-center px-8 text-center">
          <h1 className="text-4xl font-extrabold text-white text-center drop-shadow-lg mb-4 tracking-wide">{title}</h1>
          <p className="text-xl text-white/95 text-center mb-8 font-medium drop-shadow max-w-lg leading-relaxed">{subtitle}</p>
          {quote && <p className="text-white/95 italic text-center mt-8 text-xl font-bold tracking-wide">"{quote}"</p>}
        </div>
      </div>
      {/* Form Side */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-4 py-10 md:py-16">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg px-6 py-7 sm:px-8 sm:py-10 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl ring-1 ring-primary/20 mx-auto relative overflow-hidden">
          <div className="absolute -top-16 -right-10 h-40 w-40 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="md:hidden flex flex-col items-center text-center mb-6 space-y-3">
              <div className="space-y-1 px-4">
                <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
                <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitAuthLayout; 