import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { checkSupabaseConnection } from '../../config/supabase/connection';

export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
      setRetrying(false);
    } catch (error) {
      setIsConnected(false);
      setRetrying(true);
    }
  }, []);

  useEffect(() => {
    // Check initially
    checkConnection();

    // Set up interval for periodic checks
    const interval = setInterval(checkConnection, 30000);

    // Cleanup
    return () => clearInterval(interval);
  }, [checkConnection]);

  if (isConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <WifiOff className="w-5 h-5" />
      <span>{retrying ? 'Connection lost. Retrying...' : 'Connection lost'}</span>
    </div>
  );
};