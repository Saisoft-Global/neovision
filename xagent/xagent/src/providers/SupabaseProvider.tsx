import React, { useEffect, useState } from 'react';
import { supabaseInitializer } from '../config/supabase/initialization';
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
        await supabaseInitializer.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };

    supabaseInitializer.onInitialized(() => {
      setIsInitialized(true);
    });

    supabaseInitializer.onError((error) => {
      setError(error.message);
    });

    initialize();
  }, []);

  if (error) {
    return (
      <Alert
        type="error"
        message={`Database connection failed: ${error}`}
      />
    );
  }

  if (!isInitialized) {
    return <LoadingSpinner message="Connecting to database..." />;
  }

  return <>{children}</>;
};