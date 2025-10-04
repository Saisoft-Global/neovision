import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface SystemMetrics {
  active_users: number;
  storage_used: number;
  api_calls: number;
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    active_users: 0,
    storage_used: 0,
    api_calls: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('system_metrics')
          .select('*')
          .maybeSingle();

        if (queryError) throw queryError;
        
        if (mounted && data) {
          setMetrics({
            active_users: data.active_users || 0,
            storage_used: data.storage_used || 0,
            api_calls: data.api_calls || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        if (mounted) {
          setError('Failed to load system metrics');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { metrics, isLoading, error };
}