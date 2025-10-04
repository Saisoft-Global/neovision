import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Alert } from '../components/common/Alert';
import { SessionManager } from '../services/auth/SessionManager';
import { withRetry } from '../utils/retry';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize, isInitialized, isLoading, error } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize session manager first with retries
        await withRetry(
          () => SessionManager.getInstance().initialize(),
          3, // 3 retries
          1000 // 1s base delay
        );

        // Then initialize auth store
        await initialize();
      } catch (err) {
        console.error('Auth initialization error:', err);
      }
    };

    initAuth();
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner message="Initializing authentication..." />;
  }

  if (error && !isInitialized) {
    return (
      <Alert
        type="error"
        message={`Authentication initialization failed: ${error}. Please refresh the page to try again.`}
      />
    );
  }

  return <>{children}</>;
};