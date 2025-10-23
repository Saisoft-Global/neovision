/**
 * Optimistic Update Hook
 * Provides instant UI feedback before server response
 */
import { useState, useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  rollbackDelay?: number;
}

export const useOptimisticUpdate = <T,>() => {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (
      optimisticValue: T,
      asyncOperation: () => Promise<T>,
      options: OptimisticUpdateOptions<T> = {}
    ) => {
      // Immediately update UI with optimistic value
      setOptimisticData(optimisticValue);
      setIsLoading(true);
      setError(null);

      try {
        // Perform actual operation
        const result = await asyncOperation();
        
        // Update with real data
        setOptimisticData(result);
        setIsLoading(false);
        
        options.onSuccess?.(result);
        
        return result;
      } catch (err) {
        // Rollback on error
        const error = err instanceof Error ? err : new Error('Operation failed');
        setError(error);
        setIsLoading(false);
        
        // Rollback after delay
        setTimeout(() => {
          setOptimisticData(null);
        }, options.rollbackDelay || 1000);
        
        options.onError?.(error);
        
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setOptimisticData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    optimisticData,
    isLoading,
    error,
    execute,
    reset
  };
};
