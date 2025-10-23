import React, { useEffect, useState } from 'react';
import { isSupabaseConnected } from '../config/supabase';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Alert } from '../components/common/Alert';

interface SupabaseProviderProps {
  children: React.ReactNode;
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🔗 Connecting to Supabase...');
        const isConnected = await isSupabaseConnected();
        
        if (isConnected) {
          console.log('✅ Supabase connected successfully');
          setIsInitialized(true);
        } else {
          throw new Error('Failed to connect to Supabase database');
        }
      } catch (err) {
        console.error('❌ Supabase initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };

    // Add a small delay to allow other services to initialize
    const timer = setTimeout(initialize, 100);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <Alert
        type="error"
        message={`Database connection failed: ${error}. Please check your Supabase configuration.`}
      />
    );
  }

  if (!isInitialized) {
    return <LoadingSpinner message="Connecting to Supabase database..." />;
  }

  return <>{children}</>;
};