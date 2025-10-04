import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { isServiceConfigured } from '../config/environment';

export function useSupabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isServiceConfigured('supabase')) {
      setError('Supabase is not configured. Please set up your environment variables.');
      return;
    }

    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('health_check').select('*').limit(1);
        if (error) throw error;
        setIsInitialized(true);
      } catch (err: any) {
        setError(err.message);
      }
    };

    checkConnection();
  }, []);

  return { supabase, isInitialized, error };
}