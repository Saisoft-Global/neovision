import { useState, useEffect } from 'react';
import { vectorService } from '../services/vector/VectorService';
import { isServiceConfigured } from '../config/environment';

interface PineconeStatus {
  client: boolean;
  index: boolean;
  error: string | null;
  stats?: any;
}

export function usePineconeTest() {
  const [status, setStatus] = useState<PineconeStatus>({
    client: false,
    index: false,
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const testConnection = async () => {
    setIsLoading(true);
    
    try {
      if (!isServiceConfigured('pinecone')) {
        throw new Error('Pinecone is not configured. Please check your environment variables.');
      }

      // Test vector service connection via backend
      const status = await vectorService.getStatus();
      
      setStatus({
        client: status.available,
        index: status.available,
        error: status.available ? null : 'Vector service not available via backend',
        stats: status.available ? { 
          index_name: status.index_name,
          backend_available: true 
        } : null
      });
    } catch (error) {
      setStatus({
        client: false,
        index: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return {
    status,
    isLoading,
    testConnection
  };
}