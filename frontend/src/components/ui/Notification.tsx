import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose, duration }) => {
  // Default duration: 8 seconds for success, 4 seconds for errors
  const defaultDuration = duration ?? (type === 'success' ? 8000 : 4000);
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, defaultDuration);

    return () => clearTimeout(timer);
  }, [defaultDuration, onClose]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-[calc(100%-2rem)] sm:w-auto max-w-2xl px-4">
      <div 
        className={`${
          type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        } border-2 px-6 py-4 sm:px-8 sm:py-5 rounded-xl shadow-2xl flex items-start gap-4 animate-fade-in-down backdrop-blur-sm`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {type === 'success' ? (
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
          ) : (
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium leading-relaxed break-words">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Notification;
