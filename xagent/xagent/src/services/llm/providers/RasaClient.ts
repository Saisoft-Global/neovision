import type { ChatMessage } from '../types';

export class RasaClient {
  private static instance: RasaClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = 'http://localhost:5005';
  }

  public static getInstance(): RasaClient {
    if (!this.instance) {
      this.instance = new RasaClient();
    }
    return this.instance;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Rasa service unavailable');
      }

      const data = await response.json();
      return data[0]?.text || "I'm sorry, I'm having trouble understanding. Please try again.";
    } catch (error) {
      console.error('Rasa communication error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      return response.ok;
    } catch {
      return false;
    }
  }
}