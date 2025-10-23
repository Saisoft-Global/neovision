import React, { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseAvailable } from '../../config/supabase';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
}

export const SupabaseConnectionTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Check if Supabase is available
    testResults.push({
      test: 'Supabase Client Availability',
      status: isSupabaseAvailable() ? 'success' : 'error',
      message: isSupabaseAvailable() ? 'Client is available' : 'Client not available'
    });

    const supabase = getSupabaseClient();

    // Test 2: Check environment variables
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    testResults.push({
      test: 'Environment Variables',
      status: hasUrl && hasKey ? 'success' : 'error',
      message: `URL: ${hasUrl ? '✓' : '✗'}, Key: ${hasKey ? '✓' : '✗'}`
    });

    // Test 3: Try to get session
    try {
      const { data, error } = await supabase.auth.getSession();
      testResults.push({
        test: 'Auth Session',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : data.session ? 'Active session found' : 'No active session (expected for logged out user)'
      });
    } catch (error) {
      testResults.push({
        test: 'Auth Session',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 4: Try to get current user
    try {
      const { data, error } = await supabase.auth.getUser();
      
      // "Auth session missing" when logged out is EXPECTED and OK
      if (error && error.message.includes('Auth session missing')) {
        testResults.push({
          test: 'Get Current User',
          status: 'success',
          message: 'No active session (expected when logged out) ✓'
        });
      } else if (error) {
        testResults.push({
          test: 'Get Current User',
          status: 'error',
          message: `Unexpected error: ${error.message}`
        });
      } else {
        testResults.push({
          test: 'Get Current User',
          status: 'success',
          message: data.user ? `✓ Logged in as: ${data.user.email}` : 'No user (expected when logged out) ✓'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Get Current User',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 5: Test database connectivity (try to access a table)
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      testResults.push({
        test: 'Database Connection',
        status: error ? 'error' : 'success',
        message: error ? `Error: ${error.message}` : 'Successfully connected to database'
      });
    } catch (error) {
      testResults.push({
        test: 'Database Connection',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 6: Check auth state listener
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change event:', event);
      });
      
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
        testResults.push({
          test: 'Auth State Listener',
          status: 'success',
          message: 'Auth listener working correctly'
        });
      } else {
        testResults.push({
          test: 'Auth State Listener',
          status: 'error',
          message: 'Auth listener not returning subscription'
        });
      }
    } catch (error) {
      testResults.push({
        test: 'Auth State Listener',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'pending': return '○';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Supabase Connection Test</h2>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>

        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.status === 'success' ? 'border-green-200' : 
                result.status === 'error' ? 'border-red-200' : 
                'border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xl font-bold ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                    </span>
                    <h3 className="font-semibold text-gray-800">{result.test}</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">{result.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">
                ✓ Passed: {results.filter(r => r.status === 'success').length}
              </span>
              <span className="text-red-600">
                ✗ Failed: {results.filter(r => r.status === 'error').length}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Configuration Info</h3>
          <div className="text-sm space-y-1 font-mono text-gray-600">
            <div>URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 40)}...</div>
            <div>Key Length: {import.meta.env.VITE_SUPABASE_ANON_KEY?.length} characters</div>
          </div>
        </div>
      </div>
    </div>
  );
};

