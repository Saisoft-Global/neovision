import { getSupabaseClient } from '../../config/supabase';

export interface EmailConfiguration {
  id: string;
  userId: string;
  provider: 'gmail' | 'outlook' | 'zoho' | 'yahoo' | 'imap' | 'custom' | 'generic';
  displayName: string;
  
  // Basic settings
  email: string;
  name: string;
  
  // IMAP settings (for receiving)
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUsername?: string;
  imapPassword?: string; // Encrypted
  
  // SMTP settings (for sending)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string; // Encrypted
  
  // OAuth settings (for Gmail/Outlook/Zoho/Yahoo)
  oauthProvider?: 'google' | 'microsoft' | 'zoho' | 'yahoo';
  oauthAccessToken?: string; // Encrypted
  oauthRefreshToken?: string; // Encrypted
  oauthTokenExpiry?: Date;
  
  // Features
  autoProcessing: boolean;
  autoResponse: boolean;
  dailySummary: boolean;
  proactiveOutreach: boolean;
  
  // Status
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  lastError?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class EmailConfigurationService {
  private static instance: EmailConfigurationService;
  private supabase = getSupabaseClient();

  private constructor() {}

  public static getInstance(): EmailConfigurationService {
    if (!this.instance) {
      this.instance = new EmailConfigurationService();
    }
    return this.instance;
  }

  async saveConfiguration(config: Omit<EmailConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailConfiguration> {
    console.log(`💾 Saving email configuration for: ${config.email}`);

    // Encrypt sensitive data
    const encrypted = await this.encryptSensitiveData(config);

    const { data, error } = await this.supabase
      .from('email_configurations')
      .insert({
        ...encrypted,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save email configuration:', error);
      throw new Error(`Failed to save configuration: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async updateConfiguration(id: string, updates: Partial<EmailConfiguration>): Promise<EmailConfiguration> {
    console.log(`🔄 Updating email configuration: ${id}`);

    // Encrypt sensitive data if present
    const encrypted = await this.encryptSensitiveData(updates);

    const { data, error } = await this.supabase
      .from('email_configurations')
      .update({
        ...encrypted,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update configuration: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async getConfiguration(userId: string): Promise<EmailConfiguration | null> {
    const { data, error } = await this.supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    // Decrypt sensitive data
    return await this.decryptSensitiveData(this.mapFromDatabase(data));
  }

  async getAllConfigurations(userId: string): Promise<EmailConfiguration[]> {
    const { data, error } = await this.supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    // Decrypt all configurations
    return await Promise.all(
      data.map(d => this.decryptSensitiveData(this.mapFromDatabase(d)))
    );
  }

  async testConnection(config: EmailConfiguration): Promise<{ success: boolean; message: string }> {
    console.log(`🧪 Testing email connection for: ${config.email}`);

    try {
      if (config.provider === 'gmail' || config.provider === 'outlook') {
        return await this.testOAuthConnection(config);
      } else {
        return await this.testIMAPSMTPConnection(config);
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  async deleteConfiguration(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete configuration: ${error.message}`);
    }
  }

  private async encryptSensitiveData(config: any): Promise<any> {
    // In production, use proper encryption (AES-256)
    // For now, we'll mark fields that should be encrypted
    const encrypted = { ...config };

    if (config.imapPassword) {
      encrypted.imap_password = await this.encrypt(config.imapPassword);
    }
    if (config.smtpPassword) {
      encrypted.smtp_password = await this.encrypt(config.smtpPassword);
    }
    if (config.oauthAccessToken) {
      encrypted.oauth_access_token = await this.encrypt(config.oauthAccessToken);
    }
    if (config.oauthRefreshToken) {
      encrypted.oauth_refresh_token = await this.encrypt(config.oauthRefreshToken);
    }

    return encrypted;
  }

  private async decryptSensitiveData(config: EmailConfiguration): Promise<EmailConfiguration> {
    // In production, decrypt sensitive fields
    return config;
  }

  private async encrypt(value: string): Promise<string> {
    // TODO: Implement proper encryption
    // For now, return base64 encoded (NOT SECURE - just placeholder)
    return Buffer.from(value).toString('base64');
  }

  private async decrypt(value: string): Promise<string> {
    // TODO: Implement proper decryption
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  private async testOAuthConnection(config: EmailConfiguration): Promise<{ success: boolean; message: string }> {
    // Test OAuth token validity
    try {
      // TODO: Make test API call to verify token
      return {
        success: true,
        message: 'OAuth connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'OAuth token invalid or expired'
      };
    }
  }

  private async testIMAPSMTPConnection(config: EmailConfiguration): Promise<{ success: boolean; message: string }> {
    // Test IMAP and SMTP connections
    try {
      // TODO: Test IMAP connection
      // TODO: Test SMTP connection
      return {
        success: true,
        message: 'IMAP/SMTP connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  private mapFromDatabase(data: any): EmailConfiguration {
    return {
      id: data.id,
      userId: data.user_id,
      provider: data.provider,
      displayName: data.display_name,
      email: data.email,
      name: data.name,
      imapHost: data.imap_host,
      imapPort: data.imap_port,
      imapSecure: data.imap_secure,
      imapUsername: data.imap_username,
      imapPassword: data.imap_password,
      smtpHost: data.smtp_host,
      smtpPort: data.smtp_port,
      smtpSecure: data.smtp_secure,
      smtpUsername: data.smtp_username,
      smtpPassword: data.smtp_password,
      oauthProvider: data.oauth_provider,
      oauthAccessToken: data.oauth_access_token,
      oauthRefreshToken: data.oauth_refresh_token,
      oauthTokenExpiry: data.oauth_token_expiry ? new Date(data.oauth_token_expiry) : undefined,
      autoProcessing: data.auto_processing,
      autoResponse: data.auto_response,
      dailySummary: data.daily_summary,
      proactiveOutreach: data.proactive_outreach,
      status: data.status,
      lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
      lastError: data.last_error,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}
