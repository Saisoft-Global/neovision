/**
 * Google Workspace API Connector
 * Handles Google Workspace integrations (Gmail, Calendar, Drive, Admin)
 */

import { APIConnector, type APICredentials, type APIResponse } from './base/APIConnector';

export interface GoogleUser {
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  password?: string;
  orgUnitPath?: string;
  suspended?: boolean;
}

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export class GoogleWorkspaceConnector extends APIConnector {
  private adminSDK: any = null;
  private calendarAPI: any = null;

  constructor(credentials: APICredentials) {
    super(credentials, 'https://www.googleapis.com');
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection with a simple API call
      const testResult = await this.testConnection();
      this.isConnected = testResult;
      return testResult;
    } catch (error) {
      console.error('Google Workspace connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.adminSDK = null;
    this.calendarAPI = null;
  }

  async testConnection(): Promise<boolean> {
    // Test with a simple API call (get current user)
    const result = await this.makeRequest('/admin/directory/v1/users', {
      method: 'GET',
      params: { customer: 'my_customer', maxResults: '1' },
    });

    return result.success;
  }

  /**
   * Create a new user account in Google Workspace
   */
  async createUserAccount(userData: GoogleUser): Promise<APIResponse<any>> {
    console.log('🔧 Creating Google Workspace account:', userData.primaryEmail);

    return this.retryRequest(async () => {
      return await this.makeRequest('/admin/directory/v1/users', {
        method: 'POST',
        body: {
          primaryEmail: userData.primaryEmail,
          name: userData.name,
          password: userData.password || this.generateSecurePassword(),
          changePasswordAtNextLogin: true,
          orgUnitPath: userData.orgUnitPath || '/',
          suspended: userData.suspended || false,
        },
      });
    });
  }

  /**
   * Get user information
   */
  async getUser(email: string): Promise<APIResponse<any>> {
    return await this.makeRequest(`/admin/directory/v1/users/${email}`, {
      method: 'GET',
    });
  }

  /**
   * Update user account
   */
  async updateUser(email: string, updates: Partial<GoogleUser>): Promise<APIResponse<any>> {
    return await this.makeRequest(`/admin/directory/v1/users/${email}`, {
      method: 'PATCH',
      body: updates,
    });
  }

  /**
   * Delete user account
   */
  async deleteUser(email: string): Promise<APIResponse<any>> {
    return await this.makeRequest(`/admin/directory/v1/users/${email}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(event: GoogleCalendarEvent): Promise<APIResponse<any>> {
    console.log('📅 Creating calendar event:', event.summary);

    return await this.makeRequest('/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: event,
    });
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(to: string, subject: string, body: string): Promise<APIResponse<any>> {
    console.log('📧 Sending email to:', to);

    const message = this.createEmailMessage(to, subject, body);
    
    return await this.makeRequest('/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: {
        raw: message,
      },
    });
  }

  /**
   * Helper: Create base64 encoded email message
   */
  private createEmailMessage(to: string, subject: string, body: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    return btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate secure random password
   */
  private generateSecurePassword(length: number = 16): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length];
    }
    
    return password;
  }

  /**
   * Get authentication headers with Google OAuth token
   */
  protected getAuthHeaders(): Record<string, string> {
    if (this.credentials.accessToken) {
      return {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
      };
    }
    return {};
  }
}

