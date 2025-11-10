import React from 'react';
import { motion } from 'framer-motion';

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
    <div className={`min-h-screen flex ${reverse ? 'flex-row-reverse' : ''} transition-all duration-500 ease-in-out`}>
      {/* Left or Right Side (text only) */}
      <motion.div 
        className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-slate-600 via-purple-600 to-indigo-600 relative overflow-hidden"
        initial={{ opacity: 0, x: reverse ? 100 : -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${APPOINTMENT_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-indigo-800/30 to-slate-700/40" />
        
        {/* Appointly at top */}
        <motion.div 
          className="absolute top-8 left-0 right-0 flex justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-2xl font-extrabold text-white text-center drop-shadow-lg tracking-wider">
            Appointly
          </h3>
        </motion.div>
        
        <motion.div 
          className="relative z-10 flex flex-col items-center px-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-4xl font-extrabold text-white text-center drop-shadow-lg mb-4 tracking-wide">{title}</h1>
          <p className="text-xl text-white/95 text-center mb-8 font-medium drop-shadow max-w-lg leading-relaxed">{subtitle}</p>
          {quote && <p className="text-white/95 italic text-center mt-8 text-xl font-bold tracking-wide">"{quote}"</p>}
        </motion.div>
      </motion.div>
      {/* Form Side */}
      <motion.div 
        className="flex flex-col justify-center items-center w-full md:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50"
        initial={{ opacity: 0, x: reverse ? -100 : 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-xl mx-4">{children}</div>
      </motion.div>
    </div>
  );
};

export default SplitAuthLayout; 