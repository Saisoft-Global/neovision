/**
 * Connection Test Page
 * Visual interface to test all service connections
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';
import { verifyAllConnections, ConnectionStatus } from '../../utils/verifyConnections';

export const ConnectionTestPage: React.FC = () => {
  const [results, setResults] = useState<ConnectionStatus[]>([]);
  const [isTestingisLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    try {
      const testResults = await verifyAllConnections();
      setResults(testResults);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const allConnected = results.every(r => r.connected);
  const connectedCount = results.filter(r => r.connected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Connection Test
          </h1>
          <p className="text-white/60">
            Verify all external service connections
          </p>
        </div>
        <ModernButton
          onClick={runTests}
          disabled={isLoading}
          loading={isLoading}
          variant="glass"
          icon={<RefreshCw className="w-5 h-5" />}
        >
          Retest
        </ModernButton>
      </div>

      {/* Overall Status */}
      <ModernCard variant="glass">
        <div className="flex items-center gap-4">
          {isLoading ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : allConnected ? (
            <CheckCircle className="w-12 h-12 text-green-400" />
          ) : (
            <XCircle className="w-12 h-12 text-red-400" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isLoading ? 'Testing...' : allConnected ? 'All Systems Operational' : 'Some Services Unavailable'}
            </h2>
            <p className="text-white/60">
              {isLoading ? 'Running connection tests...' : `${connectedCount} of ${results.length} services connected`}
            </p>
          </div>
        </div>
      </ModernCard>

      {/* Individual Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((result, idx) => (
          <ModernCard key={idx} variant="glass">
            <div className="flex items-start gap-4">
              {result.connected ? (
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg mb-1">
                  {result.service}
                </h3>
                <p className={`text-sm mb-2 ${result.connected ? 'text-green-300' : 'text-red-300'}`}>
                  {result.message}
                </p>
                {result.details && (
                  <div className="mt-2 p-2 glass-card rounded-lg">
                    <pre className="text-xs text-white/60 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </ModernCard>
        ))}
      </div>

      {/* Recommendations */}
      {!allConnected && (
        <ModernCard variant="glass">
          <h3 className="font-semibold text-white text-lg mb-3">
            ⚠️ Recommendations
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            {results.filter(r => !r.connected).map((result, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-white/50">•</span>
                <span>
                  <strong className="text-white">{result.service}:</strong> {result.message}
                </span>
              </li>
            ))}
          </ul>
        </ModernCard>
      )}
    </div>
  );
};
