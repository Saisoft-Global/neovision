import { CommunicationConnector } from '../types';

export class EmailConnector implements CommunicationConnector {
  private client: any = null;

  async connect(credentials: Record<string, string>): Promise<void> {
    try {
      const nodemailer = await import('nodemailer');
      this.client = nodemailer.createTransport({
        host: credentials.smtpHost,
        port: parseInt(credentials.smtpPort),
        secure: credentials.smtpSecure === 'true',
        auth: {
          user: credentials.smtpUser,
          pass: credentials.smtpPassword,
        },
      });
    } catch (error) {
      console.error('Email connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  async send(message: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Email client not connected');
    }

    return this.client.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
  }

  isConnected(): boolean {
    return Boolean(this.client);
  }
}