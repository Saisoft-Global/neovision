import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { OAuthService } from '../../services/email/OAuthService';

const YahooOAuthCallback: React.FC = () => {
  const location = useLocation();
  const oauthService = OAuthService.getInstance();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('oauth_state');
    const storedProvider = sessionStorage.getItem('oauth_provider');

    if (state !== storedState || storedProvider !== 'yahoo') {
      console.error('OAuth state mismatch or provider mismatch.');
      window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ 
        error: 'State mismatch or provider mismatch.' 
      }));
      window.close();
      return;
    }

    if (code) {
      oauthService.exchangeYahooCode(code)
        .then(tokens => {
          // Get user info from Yahoo API
          // This would require additional API call to get user details
          const userInfo = {
            email: 'user@yahoo.com', // Would be fetched from Yahoo API
            name: 'Yahoo User' // Would be fetched from Yahoo API
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
          console.error('Error exchanging Yahoo code for tokens:', error);
          window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ 
            error: error.message 
          }));
          window.close();
        });
    } else {
      const error = params.get('error') || 'Unknown error';
      console.error('Yahoo OAuth error:', error);
      window.opener.sessionStorage.setItem('oauth_result', JSON.stringify({ error }));
      window.close();
    }
  }, [location, oauthService]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p>Processing Yahoo OAuth...</p>
        <p className="text-sm text-gray-400 mt-2">This window will close automatically</p>
      </div>
    </div>
  );
};

export default YahooOAuthCallback;
