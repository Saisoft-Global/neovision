import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { testDatabaseConnections } from '../../../utils/testConnections';

export const DatabaseHealth: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkHealth = async () => {
    setStatus('checking');
    const isHealthy = await testDatabaseConnections();
    setStatus(isHealthy ? 'healthy' : 'error');
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Database Health</h3>
        <button
          onClick={checkHealth}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>Neo4j</span>
          {status === 'checking' ? (
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          ) : status === 'healthy' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>Pinecone</span>
          {status === 'checking' ? (
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          ) : status === 'healthy' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="text-sm text-gray-500">
          Last checked: {lastCheck.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default DatabaseHealth;