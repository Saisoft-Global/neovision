/**
 * Google OAuth Callback Page
 * Handles the OAuth redirect from Google
 */

import React, { useEffect, useState } from 'react';
import { OAuthService } from '../../services/email/OAuthService';

export const GoogleOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Verify state parameter
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
          throw new Error('Invalid state parameter');
        }

        // Exchange code for tokens
        const oauthService = OAuthService.getInstance();
        const tokens = await oauthService.exchangeGoogleCode(code);

        // Test connection to get user info
        const connectionTest = await oauthService.testGoogleConnection(tokens.accessToken);
        if (!connectionTest.success || !connectionTest.user) {
          throw new Error('Failed to verify connection');
        }

        // Store result for parent window
        sessionStorage.setItem('oauth_result', JSON.stringify({
          ...tokens,
          user: connectionTest.user
        }));

        setStatus('success');
        setMessage('Authentication successful! You can close this window.');

        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Store error for parent window
        sessionStorage.setItem('oauth_result', JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authenticating...</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
