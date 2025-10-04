import { useState, useEffect } from 'react';
import { PineconeClient } from '../services/pinecone/PineconeClient';
import { isServiceConfigured } from '../config/environment';

export function useVectorStore() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!isServiceConfigured('openai')) {
        if (mounted) {
          setError('OpenAI API key not configured. Vector store features will be limited.');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        await PineconeClient.getInstance();
        await PineconeClient.getIndex();

        if (mounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : 'Failed to initialize vector store';
          console.error('Vector store initialization error:', err);
          setError(message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    isConfigured: isServiceConfigured('openai'),
  };
}