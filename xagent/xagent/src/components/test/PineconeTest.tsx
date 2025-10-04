import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { pineconeClient, getVectorStore, getPineconeError, resetPinecone } from '../../services/pinecone/client';

export const PineconeTest: React.FC = () => {
  const [status, setStatus] = useState<{
    client: boolean;
    index: boolean;
    error: string | null;
    stats?: any;
  }>({
    client: false,
    index: false,
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const testConnection = async () => {
    setIsLoading(true);
    resetPinecone(); // Reset any previous connection state
    
    try {
      // Test client connection
      const client = await pineconeClient.getInstance();
      const clientConnected = client !== null;
      
      // Test index connection
      const index = await getVectorStore();
      let indexConnected = false;
      let indexStats;
      
      if (index) {
        indexStats = await index.describeIndexStats();
        indexConnected = true;
      }

      const error = getPineconeError();
      
      setStatus({
        client: clientConnected,
        index: indexConnected,
        error,
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Pinecone Connection Status</h2>
        <button
          onClick={testConnection}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Test Connection</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Client Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {status.client ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium">Pinecone Client</span>
          </div>
          <span className={`text-sm ${status.client ? 'text-green-600' : 'text-red-600'}`}>
            {status.client ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Index Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {status.index ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium">Vector Index</span>
          </div>
          <span className={`text-sm ${status.index ? 'text-green-600' : 'text-red-600'}`}>
            {status.index ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Configuration Details */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Configuration</h3>
          <div className="space-y-1 text-sm">
            <p>Environment: {import.meta.env.VITE_PINECONE_ENVIRONMENT}</p>
            <p>Index Name: {import.meta.env.VITE_PINECONE_INDEX_NAME}</p>
          </div>
        </div>

        {/* Index Stats */}
        {status.stats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Index Statistics</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(status.stats, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {status.error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            <h3 className="font-medium mb-1">Error</h3>
            <p className="text-sm">{status.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};