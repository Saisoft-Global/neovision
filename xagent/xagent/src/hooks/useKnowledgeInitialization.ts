import { useState, useEffect } from 'react';
import { InitializationManager } from '../services/knowledge/initialization/InitializationManager';

export function useKnowledgeInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const manager = InitializationManager.getInstance();

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await manager.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize knowledge service');
      } finally {
        setIsLoading(false);
      }
    };

    if (!manager.isInitialized()) {
      initialize();
    } else {
      setIsInitialized(true);
      setIsLoading(false);
    }

    // Listen for initialization events
    manager.onInitialized(() => {
      setIsInitialized(true);
      setIsLoading(false);
    });

    manager.onError((error) => {
      setError(error);
      setIsLoading(false);
    });
  }, []);

  return { isInitialized, isLoading, error };
}