import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthService } from '../../services/email/OAuthService';

const ZohoOAuthCallback: React.FC = () => {
  const location = useLocation();
  const oauthService = OAuthService.getInstance();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('oauth_state');
    const storedProvider = sessionStorage.getItem('oauth_provider');

    if (state !== storedState || storedProvider !== 'zoho') {
      console.error('OAuth state mismatch or provider mismatch.');
      window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ 
        error: 'State mismatch or provider mismatch.' 
      }));
      window.close();
      return;
    }

    if (code) {
      oauthService.exchangeZohoCode(code)
        .then(tokens => {
          // Get user info from Zoho API
          // This would require additional API call to get user details
          const userInfo = {
            email: 'user@zoho.com', // Would be fetched from Zoho API
            name: 'Zoho User' // Would be fetched from Zoho API
          };

          const result = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            user: userInfo
          };

          window.opener.sessionStorage.setItem('oauth_result', JSON.stringify(result));
          window.close();
        })
        .catch(error => {
          console.error('Error exchanging Zoho code for tokens:', error);
          window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ 
            error: error.message 
          }));
          window.close();
        });
    } else {
      const error = params.get('error') || 'Unknown error';
      console.error('Zoho OAuth error:', error);
      window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ error }));
      window.close();
    }
  }, [location, oauthService]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Processing Zoho OAuth...</p>
        <p className="text-sm text-gray-400 mt-2">This window will close automatically</p>
      </div>
    </div>
  );
};

export default ZohoOAuthCallback;
