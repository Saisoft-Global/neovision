import { useState, useEffect } from 'react';
import { PineconeClient } from '../services/pinecone/PineconeClient';
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
    PineconeClient.reset();
    
    try {
      if (!isServiceConfigured('pinecone')) {
        throw new Error('Pinecone is not configured. Please check your environment variables.');
      }

      const client = await PineconeClient.getInstance();
      const clientConnected = client !== null;
      
      const index = await PineconeClient.getIndex();
      let indexConnected = false;
      let indexStats;
      
      if (index) {
        indexStats = await index.describeIndexStats();
        indexConnected = true;
      }

      setStatus({
        client: clientConnected,
        index: indexConnected,
        error: null,
        stats: indexStats
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