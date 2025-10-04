import { CommunicationConnector } from '../types';

export class WhatsAppConnector implements CommunicationConnector {
  private client: any = null;
  private credentials: Record<string, string> = {};

  async connect(credentials: Record<string, string>): Promise<void> {
    this.credentials = credentials;
    try {
      // Initialize WhatsApp Business API client
      const response = await fetch('https://graph.facebook.com/v17.0/oauth/access_token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('WhatsApp authentication failed');
      }

      const data = await response.json();
      this.client = {
        connected: true,
        accessToken: data.access_token,
        phoneNumberId: credentials.phoneNumberId,
      };
    } catch (error) {
      console.error('WhatsApp connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async send(message: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${this.client.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.client.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: message.to,
            type: message.type || 'text',
            text: message.type === 'text' ? {
              body: message.text,
            } : undefined,
            template: message.type === 'template' ? {
              name: message.templateName,
              language: { code: message.languageCode || 'en' },
              components: message.components,
            } : undefined,
            media: message.type === 'media' ? {
              type: message.mediaType,
              url: message.mediaUrl,
              caption: message.caption,
            } : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp message');
      }

      return response.json();
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return Boolean(this.client?.connected);
  }
}