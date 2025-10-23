/**
 * OAuth Service for Gmail and Microsoft 365 Integration
 * Handles OAuth 2.0 authentication flow for email providers
 * Browser-compatible implementation using direct HTTP calls
 */

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string; // Optional, defaults to 'common'
}

export interface ZohoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YahooOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class OAuthService {
  private static instance: OAuthService;
  private googleConfig: GoogleOAuthConfig | null = null;
  private microsoftConfig: MicrosoftOAuthConfig | null = null;
  private zohoConfig: ZohoOAuthConfig | null = null;
  private yahooConfig: YahooOAuthConfig | null = null;

  private constructor() {
    this.loadConfigurations();
  }

  public static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  private loadConfigurations(): void {
    // Load from environment variables
    this.googleConfig = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/google/callback`
    };

    this.microsoftConfig = {
      clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_MICROSOFT_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI || `${window.location.origin}/oauth/microsoft/callback`,
      tenantId: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common'
    };

    this.zohoConfig = {
      clientId: import.meta.env.VITE_ZOHO_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_ZOHO_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_ZOHO_REDIRECT_URI || `${window.location.origin}/oauth/zoho/callback`
    };

    this.yahooConfig = {
      clientId: import.meta.env.VITE_YAHOO_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_YAHOO_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_YAHOO_REDIRECT_URI || `${window.location.origin}/oauth/yahoo/callback`
    };
  }

  /**
   * Generate Google OAuth authorization URL
   */
  public generateGoogleAuthUrl(state?: string): string {
    if (!this.googleConfig?.clientId) {
      throw new Error('Google OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const params = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      redirect_uri: this.googleConfig.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || crypto.randomUUID()
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Generate Microsoft OAuth authorization URL
   */
  public generateMicrosoftAuthUrl(state?: string): string {
    if (!this.microsoftConfig?.clientId) {
      throw new Error('Microsoft OAuth not configured. Please set VITE_MICROSOFT_CLIENT_ID');
    }

    const scopes = [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/User.Read'
    ];

    const params = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      response_type: 'code',
      redirect_uri: this.microsoftConfig.redirectUri,
      scope: scopes.join(' '),
      response_mode: 'query',
      state: state || crypto.randomUUID(),
      prompt: 'consent'
    });

    const tenant = this.microsoftConfig.tenantId || 'common';
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange Google authorization code for tokens
   */
  public async exchangeGoogleCode(code: string): Promise<OAuthTokens> {
    if (!this.googleConfig) {
      throw new Error('Google OAuth not configured');
    }

    const tokenEndpoint = 'https://oauth2.googleapis.com/token';

    const body = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      client_secret: this.googleConfig.clientSecret,
      code: code,
      redirect_uri: this.googleConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(' ') || []
      };
    } catch (error) {
      console.error('Google OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Exchange Microsoft authorization code for tokens
   */
  public async exchangeMicrosoftCode(code: string): Promise<OAuthTokens> {
    if (!this.microsoftConfig) {
      throw new Error('Microsoft OAuth not configured');
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${this.microsoftConfig.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      client_secret: this.microsoftConfig.clientSecret,
      code: code,
      redirect_uri: this.microsoftConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(' ') || []
      };
    } catch (error) {
      console.error('Microsoft OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh Google access token
   */
  public async refreshGoogleToken(refreshToken: string): Promise<OAuthTokens> {
    if (!this.googleConfig) {
      throw new Error('Google OAuth not configured');
    }

    const tokenEndpoint = 'https://oauth2.googleapis.com/token';

    const body = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      client_secret: this.googleConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      if (!tokens.access_token) {
        throw new Error('Failed to refresh access token');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(' ') || []
      };
    } catch (error) {
      console.error('Google token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Refresh Microsoft access token
   */
  public async refreshMicrosoftToken(refreshToken: string): Promise<OAuthTokens> {
    if (!this.microsoftConfig) {
      throw new Error('Microsoft OAuth not configured');
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${this.microsoftConfig.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      client_secret: this.microsoftConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      if (!tokens.access_token) {
        throw new Error('Failed to refresh access token');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(' ') || []
      };
    } catch (error) {
      console.error('Microsoft token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Test Google OAuth connection
   */
  public async testGoogleConnection(accessToken: string): Promise<{ success: boolean; user?: any }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();

      return {
        success: true,
        user: {
          email: userInfo.email,
          name: userInfo.name,
          id: userInfo.id
        }
      };
    } catch (error) {
      console.error('Google connection test failed:', error);
      return { success: false };
    }
  }

  /**
   * Test Microsoft OAuth connection
   */
  public async testMicrosoftConnection(accessToken: string): Promise<{ success: boolean; user?: any }> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const user = await response.json();

      return {
        success: true,
        user: {
          email: user.mail || user.userPrincipalName,
          name: user.displayName,
          id: user.id
        }
      };
    } catch (error) {
      console.error('Microsoft connection test failed:', error);
      return { success: false };
    }
  }

  /**
   * Generate Zoho OAuth authorization URL
   */
  public generateZohoAuthUrl(state?: string): string {
    if (!this.zohoConfig?.clientId) {
      throw new Error('Zoho OAuth not configured. Please set VITE_ZOHO_CLIENT_ID');
    }

    const scopes = [
      'ZohoMail.messages.READ',
      'ZohoMail.messages.CREATE',
      'ZohoMail.messages.UPDATE',
      'ZohoMail.accounts.READ'
    ];

    const params = new URLSearchParams({
      client_id: this.zohoConfig.clientId,
      response_type: 'code',
      redirect_uri: this.zohoConfig.redirectUri,
      scope: scopes.join(','),
      state: state || crypto.randomUUID(),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  /**
   * Generate Yahoo OAuth authorization URL
   */
  public generateYahooAuthUrl(state?: string): string {
    if (!this.yahooConfig?.clientId) {
      throw new Error('Yahoo OAuth not configured. Please set VITE_YAHOO_CLIENT_ID');
    }

    const scopes = [
      'mail-r',
      'mail-w',
      'profile'
    ];

    const params = new URLSearchParams({
      client_id: this.yahooConfig.clientId,
      response_type: 'code',
      redirect_uri: this.yahooConfig.redirectUri,
      scope: scopes.join(' '),
      state: state || crypto.randomUUID(),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
  }

  /**
   * Exchange Zoho authorization code for tokens
   */
  public async exchangeZohoCode(code: string): Promise<OAuthTokens> {
    if (!this.zohoConfig) {
      throw new Error('Zoho OAuth not configured');
    }

    const tokenEndpoint = 'https://accounts.zoho.com/oauth/v2/token';

    const body = new URLSearchParams({
      client_id: this.zohoConfig.clientId,
      client_secret: this.zohoConfig.clientSecret,
      code: code,
      redirect_uri: this.zohoConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Zoho token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(',') || []
      };
    } catch (error) {
      console.error('Zoho OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Exchange Yahoo authorization code for tokens
   */
  public async exchangeYahooCode(code: string): Promise<OAuthTokens> {
    if (!this.yahooConfig) {
      throw new Error('Yahoo OAuth not configured');
    }

    const tokenEndpoint = 'https://api.login.yahoo.com/oauth2/get_token';

    const body = new URLSearchParams({
      client_id: this.yahooConfig.clientId,
      client_secret: this.yahooConfig.clientSecret,
      code: code,
      redirect_uri: this.yahooConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Yahoo token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        scope: tokens.scope?.split(' ') || []
      };
    } catch (error) {
      console.error('Yahoo OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Check if OAuth is properly configured
   */
  public isConfigured(): { google: boolean; microsoft: boolean; zoho: boolean; yahoo: boolean } {
    return {
      google: !!(this.googleConfig?.clientId && this.googleConfig?.clientSecret),
      microsoft: !!(this.microsoftConfig?.clientId && this.microsoftConfig?.clientSecret),
      zoho: !!(this.zohoConfig?.clientId && this.zohoConfig?.clientSecret),
      yahoo: !!(this.yahooConfig?.clientId && this.yahooConfig?.clientSecret)
    };
  }

  /**
   * Get configuration status for UI
   */
  public getConfigurationStatus(): {
    google: { configured: boolean; missing: string[] };
    microsoft: { configured: boolean; missing: string[] };
    zoho: { configured: boolean; missing: string[] };
    yahoo: { configured: boolean; missing: string[] };
  } {
    const googleMissing = [];
    const microsoftMissing = [];
    const zohoMissing = [];
    const yahooMissing = [];

    if (!this.googleConfig?.clientId) googleMissing.push('VITE_GOOGLE_CLIENT_ID');
    if (!this.googleConfig?.clientSecret) googleMissing.push('VITE_GOOGLE_CLIENT_SECRET');

    if (!this.microsoftConfig?.clientId) microsoftMissing.push('VITE_MICROSOFT_CLIENT_ID');
    if (!this.microsoftConfig?.clientSecret) microsoftMissing.push('VITE_MICROSOFT_CLIENT_SECRET');

    if (!this.zohoConfig?.clientId) zohoMissing.push('VITE_ZOHO_CLIENT_ID');
    if (!this.zohoConfig?.clientSecret) zohoMissing.push('VITE_ZOHO_CLIENT_SECRET');

    if (!this.yahooConfig?.clientId) yahooMissing.push('VITE_YAHOO_CLIENT_ID');
    if (!this.yahooConfig?.clientSecret) yahooMissing.push('VITE_YAHOO_CLIENT_SECRET');

    return {
      google: {
        configured: googleMissing.length === 0,
        missing: googleMissing
      },
      microsoft: {
        configured: microsoftMissing.length === 0,
        missing: microsoftMissing
      },
      zoho: {
        configured: zohoMissing.length === 0,
        missing: zohoMissing
      },
      yahoo: {
        configured: yahooMissing.length === 0,
        missing: yahooMissing
      }
    };
  }
}
