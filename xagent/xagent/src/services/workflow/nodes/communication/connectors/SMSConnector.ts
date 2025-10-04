import { CommunicationConnector } from '../types';

export class SMSConnector implements CommunicationConnector {
  private client: any = null;
  private credentials: Record<string, string> = {};

  async connect(credentials: Record<string, string>): Promise<void> {
    this.credentials = credentials;
    // Initialize SMS client (e.g., Twilio, AWS SNS)
    switch (credentials.provider) {
      case 'twilio':
        const twilio = await import('twilio');
        this.client = twilio(credentials.accountSid, credentials.authToken);
        break;
      case 'aws-sns':
        const AWS = await import('aws-sdk');
        this.client = new AWS.SNS({
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          region: credentials.region,
        });
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${credentials.provider}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async send(message: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('SMS client not connected');
    }

    switch (this.credentials.provider) {
      case 'twilio':
        return this.client.messages.create({
          body: message.text,
          to: message.to,
          from: message.from,
        });
      case 'aws-sns':
        return this.client.publish({
          Message: message.text as string,
          PhoneNumber: message.to as string,
        }).promise();
      default:
        throw new Error(`Unsupported SMS provider: ${this.credentials.provider}`);
    }
  }

  isConnected(): boolean {
    return Boolean(this.client);
  }
}