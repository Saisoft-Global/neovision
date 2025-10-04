import { CommunicationConnector } from '../types';

export class SlackConnector implements CommunicationConnector {
  private token: string | null = null;

  async connect(credentials: Record<string, string>): Promise<void> {
    this.token = credentials.slackToken;
  }

  async disconnect(): Promise<void> {
    this.token = null;
  }

  async send(message: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Slack client not connected');
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send Slack message');
    }

    return response.json();
  }

  isConnected(): boolean {
    return Boolean(this.token);
  }
}