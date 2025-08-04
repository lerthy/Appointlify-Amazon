import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in-down`}>
        <span>{type === 'success' ? '✅' : '❌'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Notification; // UI improvements
// UI improvements
// UI improvements
export const Notification = ({ message, type = 'info' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type];
  return isVisible ? (
    <div className={}>
      <div className='flex justify-between items-center'>
        <span>{message}</span>
        <button onClick={() => setIsVisible(false)} className='ml-4 text-white'>×</button>
      </div>
    </div>
  ) : null;
};
