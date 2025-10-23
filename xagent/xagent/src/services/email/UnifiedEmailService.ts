import type { Email } from '../../types/email';
import { EmailConfigurationService, type EmailConfiguration } from './EmailConfigurationService';
import { IMAPEmailProvider } from './providers/IMAPEmailProvider';
import { SMTPEmailProvider } from './providers/SMTPEmailProvider';
import { GmailProvider } from './providers/GmailProvider';
import { OutlookProvider } from './providers/OutlookProvider';
import { ZohoProvider } from './providers/ZohoProvider';
import { YahooProvider } from './providers/YahooProvider';
import { GenericProvider } from './providers/GenericProvider';

export class UnifiedEmailService {
  private static instance: UnifiedEmailService;
  private configService: EmailConfigurationService;
  private providers: Map<string, any> = new Map();

  private constructor() {
    this.configService = EmailConfigurationService.getInstance();
  }

  public static getInstance(): UnifiedEmailService {
    if (!this.instance) {
      this.instance = new UnifiedEmailService();
    }
    return this.instance;
  }

  async fetchEmails(
    userId: string,
    options?: {
      since?: Date;
      limit?: number;
      unreadOnly?: boolean;
    }
  ): Promise<Email[]> {
    // Get user's email configuration
    const config = await this.configService.getConfiguration(userId);
    
    if (!config) {
      throw new Error('No email configuration found. Please configure email settings.');
    }

    // Get appropriate provider
    const provider = await this.getProvider(config);

    // Fetch emails
    return await provider.fetchEmails(options);
  }

  async sendEmail(
    userId: string,
    email: {
      to: string | string[];
      subject: string;
      body: string;
      html?: string;
      cc?: string[];
      bcc?: string[];
      attachments?: any[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Get user's email configuration
    const config = await this.configService.getConfiguration(userId);
    
    if (!config) {
      throw new Error('No email configuration found. Please configure email settings.');
    }

    // Get appropriate provider
    const provider = await this.getProvider(config);

    // Send email
    if (provider instanceof GmailProvider || provider instanceof OutlookProvider) {
      return await provider.sendEmail(email);
    } else if (provider instanceof SMTPEmailProvider) {
      return await provider.sendEmail(email);
    }

    throw new Error('Invalid email provider');
  }

  async markAsRead(userId: string, emailId: string): Promise<void> {
    const config = await this.configService.getConfiguration(userId);
    if (!config) return;

    const provider = await this.getProvider(config);
    await provider.markAsRead(emailId);
  }

  private async getProvider(config: EmailConfiguration): Promise<any> {
    const cacheKey = `${config.userId}-${config.provider}`;

    // Check cache
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey);
    }

    // Create provider based on configuration
    let provider;

    switch (config.provider) {
      case 'gmail':
        provider = new GmailProvider(config);
        break;
      
      case 'outlook':
        provider = new OutlookProvider(config);
        break;
      
      case 'zoho':
        provider = new ZohoProvider(config);
        break;
      
      case 'yahoo':
        provider = new YahooProvider(config);
        break;
      
      case 'imap':
      case 'custom':
        // Use IMAP for receiving and SMTP for sending
        const imapProvider = new IMAPEmailProvider(config);
        const smtpProvider = new SMTPEmailProvider(config);
        
        // Combine both providers
        provider = {
          fetchEmails: (opts: any) => imapProvider.fetchEmails(opts),
          sendEmail: (email: any) => smtpProvider.sendEmail(email),
          markAsRead: (id: string) => imapProvider.markAsRead(id)
        };
        break;
      
      case 'generic':
        provider = new GenericProvider(config);
        break;
      
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }

    // Connect provider
    if (provider.connect) {
      await provider.connect();
    }

    // Cache provider
    this.providers.set(cacheKey, provider);

    return provider;
  }

  async testConnection(config: EmailConfiguration): Promise<{ success: boolean; message: string }> {
    try {
      const provider = await this.getProvider(config);
      
      // Try to fetch 1 email as connection test
      await provider.fetchEmails({ limit: 1 });

      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async disconnectAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      if (provider.disconnect) {
        await provider.disconnect();
      }
    }
    this.providers.clear();
  }
}
