import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/ui/Notification';

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
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
}; // Error handling
// Error handling
// Error handling
export const NotificationContext = createContext();
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {notifications.map(notification => (
        <Notification key={notification.id} message={notification.message} type={notification.type} />
      ))}
    </NotificationContext.Provider>
  );
};
