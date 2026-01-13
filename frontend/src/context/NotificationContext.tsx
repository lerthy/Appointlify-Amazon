import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/ui/Notification';

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error', duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    duration?: number;
  } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error', duration?: number) => {
    setNotification({ message, type, duration });
  }, []);

  const handleClose = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={handleClose}
          duration={notification.duration}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
