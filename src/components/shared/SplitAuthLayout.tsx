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
      {/* Left or Right Side (logo/text) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-green-200 via-blue-200 to-blue-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${APPOINTMENT_BG})` }} />
        <div className="relative z-10 flex flex-col items-center px-4">
          <img src={logoUrl} alt="Logo" className="h-20 w-20 mb-4 drop-shadow-xl rounded-full bg-white/80 p-1" />
          <h1 className="text-2xl font-extrabold text-white text-center drop-shadow-lg mb-2">{title}</h1>
          <p className="text-base text-white/90 text-center mb-4 font-medium drop-shadow">{subtitle}</p>
          {quote && <p className="text-white/80 italic text-center mt-4 text-xs">"{quote}"</p>}
        </div>
      </div>
      {/* Form Side */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-full max-w-sm p-4 bg-white rounded-xl shadow-xl mx-2">{children}</div>
      </div>
    </div>
  );
};

export default SplitAuthLayout; 