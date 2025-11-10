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

const SplitAuthLayout: React.FC<SplitAuthLayoutProps> = ({ logoUrl, title, subtitle, quote, children, reverse }) => {
  return (
    <div className={`min-h-screen flex ${reverse ? 'flex-row-reverse' : ''}`}>
      {/* Left or Right Side (text only) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-slate-600 via-purple-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${APPOINTMENT_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-indigo-800/30 to-slate-700/40" />
        
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
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-xl mx-4">{children}</div>
      </div>
    </div>
  );
};

export default SplitAuthLayout; 