import { CommunicationConnector } from '../types';

export class TeamsConnector implements CommunicationConnector {
  private webhookUrl: string | null = null;

  async connect(credentials: Record<string, string>): Promise<void> {
    this.webhookUrl = credentials.teamsWebhookUrl;
  }

  async disconnect(): Promise<void> {
    this.webhookUrl = null;
  }

  async send(message: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Teams client not connected');
    }

    const response = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: message.card,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send Teams message');
    }

    return response.json();
  }

  isConnected(): boolean {
    return Boolean(this.webhookUrl);
  }
}