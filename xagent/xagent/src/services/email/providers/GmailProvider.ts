import type { Email } from '../../../types/email';
import type { EmailConfiguration } from '../EmailConfigurationService';
import { OAuthService } from '../OAuthService';

// Gmail API integration using REST API (browser-compatible)
// Uses direct fetch calls instead of googleapis library

export class GmailProvider {
  private config: EmailConfiguration;
  private baseUrl: string = 'https://gmail.googleapis.com/gmail/v1';
  private oauthService: OAuthService;

  constructor(config: EmailConfiguration) {
    this.config = config;
    this.oauthService = OAuthService.getInstance();
  }

  async connect(): Promise<void> {
    console.log(`📥 Connecting to Gmail API for: ${this.config.email}`);

    if (!this.config.oauthAccessToken) {
      throw new Error('No OAuth access token found. Please complete OAuth flow first.');
    }

    try {
      // Initialize OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        import.meta.env.VITE_GOOGLE_CLIENT_ID,
        import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/google/callback`
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: this.config.oauthAccessToken,
        refresh_token: this.config.oauthRefreshToken
      });

      // Initialize Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Test connection
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Connected to Gmail for: ${profile.data.emailAddress}`);
    } catch (error) {
      console.error('Gmail connection failed:', error);
      
      // Try to refresh token if access token is expired
      if (this.config.oauthRefreshToken) {
        console.log('🔄 Attempting to refresh Gmail token...');
        try {
          const newTokens = await this.oauthService.refreshGoogleToken(this.config.oauthRefreshToken);
          
          // Update config with new tokens
          this.config.oauthAccessToken = newTokens.accessToken;
          this.config.oauthRefreshToken = newTokens.refreshToken;
          
          // Retry connection
          await this.connect();
          return;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Gmail connection failed and token refresh unsuccessful. Please re-authenticate.');
        }
      }
      
      throw error;
    }
  }

  async fetchEmails(options?: {
    since?: Date;
    limit?: number;
    unreadOnly?: boolean;
    query?: string;
  }): Promise<Email[]> {
    console.log(`📧 Fetching emails from Gmail: ${this.config.email}`);

    if (!this.gmail) {
      await this.connect();
    }

    try {
      // Build Gmail query
      let query = options?.query || '';
      
      if (options?.unreadOnly) {
        query += ' is:unread';
      }
      
      if (options?.since) {
        const dateStr = options.since.toISOString().split('T')[0];
        query += ` after:${dateStr}`;
      }

      // Fetch emails using Gmail API
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: options?.limit || 50
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        return [];
      }

      // Fetch full message details
      const messages = await Promise.all(
        response.data.messages.map(async (msg: any) => {
          try {
            const full = await this.gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full'
            });
            return this.parseGmailMessage(full.data);
          } catch (error) {
            console.error(`Failed to fetch message ${msg.id}:`, error);
            return null;
          }
        })
      );

      // Filter out failed messages
      return messages.filter(msg => msg !== null) as Email[];
    } catch (error) {
      console.error('Gmail fetch error:', error);
      
      // If it's an auth error, try to refresh token
      if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
        console.log('🔄 Auth error detected, attempting token refresh...');
        if (this.config.oauthRefreshToken) {
          try {
            const newTokens = await this.oauthService.refreshGoogleToken(this.config.oauthRefreshToken);
            this.config.oauthAccessToken = newTokens.accessToken;
            this.config.oauthRefreshToken = newTokens.refreshToken;
            
            // Retry the request
            return this.fetchEmails(options);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Gmail authentication failed. Please re-authenticate.');
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
    console.log(`📧 Sending email via Gmail to: ${email.to}`);

    if (!this.gmail) {
      await this.connect();
    }

    try {
      // Create MIME message
      const message = this.createMimeMessage(email);
      
      // Send email using Gmail API
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(message).toString('base64')
        }
      });

      return {
        success: true,
        messageId: response.data.id
      };
    } catch (error) {
      console.error('Gmail send error:', error);
      
      // If it's an auth error, try to refresh token
      if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
        console.log('🔄 Auth error detected during send, attempting token refresh...');
        if (this.config.oauthRefreshToken) {
          try {
            const newTokens = await this.oauthService.refreshGoogleToken(this.config.oauthRefreshToken);
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
    if (!this.gmail) {
      await this.connect();
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      console.log(`✅ Marked email ${emailId} as read`);
    } catch (error) {
      console.error(`Failed to mark email ${emailId} as read:`, error);
      throw error;
    }
  }

  async addLabel(emailId: string, label: string): Promise<void> {
    if (!this.gmail) {
      await this.connect();
    }

    try {
      // First, get or create the label
      const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
      let labelId = labelsResponse.data.labels.find((l: any) => l.name === label)?.id;

      if (!labelId) {
        // Create the label if it doesn't exist
        const createResponse = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: label,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        labelId = createResponse.data.id;
      }

      // Add the label to the message
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
      console.log(`✅ Added label "${label}" to email ${emailId}`);
    } catch (error) {
      console.error(`Failed to add label "${label}" to email ${emailId}:`, error);
      throw error;
    }
  }

  private createMimeMessage(email: {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): string {
    const toArray = Array.isArray(email.to) ? email.to : [email.to];
    const ccArray = email.cc || [];
    const bccArray = email.bcc || [];

    let message = [
      `From: ${this.config.name} <${this.config.email}>`,
      `To: ${toArray.join(', ')}`,
      ...(ccArray.length > 0 ? [`Cc: ${ccArray.join(', ')}`] : []),
      ...(bccArray.length > 0 ? [`Bcc: ${bccArray.join(', ')}`] : []),
      `Subject: ${email.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="boundary123"`,
      '',
      `--boundary123`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      email.body,
      '',
      ...(email.html ? [
        `--boundary123`,
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        email.html,
        ''
      ] : []),
      `--boundary123--`
    ].join('\r\n');

    return message;
  }

  private parseGmailMessage(message: any): Email {
    const headers = message.payload.headers;
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: message.id,
      subject: getHeader('Subject') || '',
      from: this.parseEmailAddress(getHeader('From')),
      to: [this.parseEmailAddress(getHeader('To'))],
      content: this.extractBody(message.payload),
      timestamp: new Date(parseInt(message.internalDate)),
      threadId: message.threadId,
      status: 'received',
      labels: message.labelIds || []
    };
  }

  private parseEmailAddress(addressString: string): { email: string; name?: string } {
    const match = addressString?.match(/(.+?)\s*<(.+?)>/) || [];
    return {
      name: match[1]?.trim(),
      email: match[2] || addressString
    };
  }

  private extractBody(payload: any): string {
    if (payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return '';
  }

  private getMockEmails(): Email[] {
    return [
      {
        id: crypto.randomUUID(),
        subject: 'Project Update Request',
        from: { email: 'client@example.com', name: 'John Client' },
        to: [{ email: this.config.email, name: this.config.name }],
        content: 'Can you provide an update on the project timeline?',
        timestamp: new Date(),
        status: 'received',
        labels: []
      }
    ];
  }
}
