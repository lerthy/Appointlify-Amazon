import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

interface RealtimeStatusProps {
  businessId: string | null;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ businessId }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showStatus, setShowStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!businessId) {
      setIsConnected(false);
      return;
    }

    // Create a test channel to check connection status
    const statusChannel = supabase
      .channel(`status_${businessId}`)
      .subscribe((status) => {
        console.log('[RealtimeStatus] Connection status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setShowStatus(true);
          // Hide status after 3 seconds if connected
          setTimeout(() => setShowStatus(false), 3000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          setShowStatus(true);
        }
      });

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [businessId]);

  // Show status temporarily when it changes
  useEffect(() => {
    if (!isConnected) {
      setShowStatus(true);
    }
  }, [isConnected]);

  if (!showStatus && isConnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
        isConnected
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 animate-pulse" />
          <span>Live updates active</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Connecting...</span>
        </>
      )}
    </div>
  );
};

export default RealtimeStatus;

