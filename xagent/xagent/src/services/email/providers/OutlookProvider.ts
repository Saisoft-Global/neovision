import type { Email } from '../../../types/email';
import type { EmailConfiguration } from '../EmailConfigurationService';
import { Client } from '@microsoft/microsoft-graph-client';
import { OAuthService } from '../OAuthService';

// Microsoft Graph API integration
// Requires: npm install @microsoft/microsoft-graph-client

export class OutlookProvider {
  private client: any; // Microsoft Graph client
  private config: EmailConfiguration;
  private oauthService: OAuthService;

  constructor(config: EmailConfiguration) {
    this.config = config;
    this.oauthService = OAuthService.getInstance();
  }

  async connect(): Promise<void> {
    console.log(`📥 Connecting to Microsoft Graph for: ${this.config.email}`);

    if (!this.config.oauthAccessToken) {
      throw new Error('No OAuth access token found. Please complete OAuth flow first.');
    }

    try {
      // Initialize Microsoft Graph client
      this.client = Client.init({
        authProvider: (done) => {
          done(null, this.config.oauthAccessToken);
        }
      });

      // Test connection
      const user = await this.client.api('/me').get();
      console.log(`✅ Connected to Microsoft Graph for: ${user.mail || user.userPrincipalName}`);
    } catch (error) {
      console.error('Microsoft Graph connection failed:', error);
      
      // Try to refresh token if access token is expired
      if (this.config.oauthRefreshToken) {
        console.log('🔄 Attempting to refresh Microsoft token...');
        try {
          const newTokens = await this.oauthService.refreshMicrosoftToken(this.config.oauthRefreshToken);
          
          // Update config with new tokens
          this.config.oauthAccessToken = newTokens.accessToken;
          this.config.oauthRefreshToken = newTokens.refreshToken;
          
          // Retry connection
          await this.connect();
          return;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Microsoft Graph connection failed and token refresh unsuccessful. Please re-authenticate.');
        }
      }
      
      throw error;
    }
  }

  async fetchEmails(options?: {
    since?: Date;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<Email[]> {
    console.log(`📧 Fetching emails from Outlook: ${this.config.email}`);

    if (!this.client) {
      await this.connect();
    }

    try {
      // Build filter query
      let filter = '';
      
      if (options?.unreadOnly) {
        filter = 'isRead eq false';
      }
      
      if (options?.since) {
        const dateStr = options.since.toISOString();
        filter += (filter ? ' and ' : '') + `receivedDateTime ge ${dateStr}`;
      }

      // Fetch emails using Microsoft Graph API
      let request = this.client
        .api('/me/messages')
        .top(options?.limit || 50)
        .orderby('receivedDateTime desc')
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,body,isRead,categories');

      if (filter) {
        request = request.filter(filter);
      }

      const response = await request.get();

      if (!response.value || response.value.length === 0) {
        return [];
      }

      return response.value.map((msg: any) => this.parseOutlookMessage(msg));
    } catch (error) {
      console.error('Outlook fetch error:', error);
      
      // If it's an auth error, try to refresh token
      if (error.message?.includes('InvalidAuthenticationToken') || error.message?.includes('unauthorized')) {
        console.log('🔄 Auth error detected, attempting token refresh...');
        if (this.config.oauthRefreshToken) {
          try {
            const newTokens = await this.oauthService.refreshMicrosoftToken(this.config.oauthRefreshToken);
            this.config.oauthAccessToken = newTokens.accessToken;
            this.config.oauthRefreshToken = newTokens.refreshToken;
            
            // Retry the request
            return this.fetchEmails(options);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Outlook authentication failed. Please re-authenticate.');
          }
        }
      }
      
      throw error;
    }
  }

  async sendEmail(email: {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): Promise<{ success: boolean; messageId?: string }> {
    console.log(`📧 Sending email via Outlook to: ${email.to}`);

    if (!this.client) {
      await this.connect();
    }

    try {
      const message = {
        subject: email.subject,
        body: {
          contentType: email.html ? 'HTML' : 'Text',
          content: email.html || email.body
        },
        toRecipients: this.formatRecipients(email.to),
        ccRecipients: email.cc ? this.formatRecipients(email.cc) : undefined,
        bccRecipients: email.bcc ? this.formatRecipients(email.bcc) : undefined
      };

      const response = await this.client
        .api('/me/sendMail')
        .post({ message });

      return {
        success: true,
        messageId: response.id
      };
    } catch (error) {
      console.error('Outlook send error:', error);
      
      // If it's an auth error, try to refresh token
      if (error.message?.includes('InvalidAuthenticationToken') || error.message?.includes('unauthorized')) {
        console.log('🔄 Auth error detected during send, attempting token refresh...');
        if (this.config.oauthRefreshToken) {
          try {
            const newTokens = await this.oauthService.refreshMicrosoftToken(this.config.oauthRefreshToken);
            this.config.oauthAccessToken = newTokens.accessToken;
            this.config.oauthRefreshToken = newTokens.refreshToken;
            
            // Retry the send
            return this.sendEmail(email);
          } catch (refreshError) {
            console.error('Token refresh failed during send:', refreshError);
            return {
              success: false
            };
          }
        }
      }
      
      return {
        success: false
      };
    }
  }

  async markAsRead(emailId: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      await this.client
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: true });
      console.log(`✅ Marked email ${emailId} as read`);
    } catch (error) {
      console.error(`Failed to mark email ${emailId} as read:`, error);
      throw error;
    }
  }

  async moveToFolder(emailId: string, folderId: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      await this.client
        .api(`/me/messages/${emailId}/move`)
        .post({ destinationId: folderId });
      console.log(`✅ Moved email ${emailId} to folder ${folderId}`);
    } catch (error) {
      console.error(`Failed to move email ${emailId} to folder ${folderId}:`, error);
      throw error;
    }
  }

  private parseOutlookMessage(message: any): Email {
    return {
      id: message.id,
      subject: message.subject || '',
      from: {
        email: message.from?.emailAddress?.address || '',
        name: message.from?.emailAddress?.name
      },
      to: (message.toRecipients || []).map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      content: message.body?.content || '',
      timestamp: new Date(message.receivedDateTime),
      status: 'received',
      labels: message.categories || []
    };
  }

  private formatRecipients(emails: string | string[]): any[] {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    return emailArray.map(email => ({
      emailAddress: {
        address: email
      }
    }));
  }

  private getMockEmails(): Email[] {
    return [
      {
        id: crypto.randomUUID(),
        subject: 'Meeting Request',
        from: { email: 'colleague@company.com', name: 'Jane Colleague' },
        to: [{ email: this.config.email, name: this.config.name }],
        content: 'Can we schedule a meeting to discuss the project?',
        timestamp: new Date(),
        status: 'received',
        labels: []
      }
    ];
  }
}
