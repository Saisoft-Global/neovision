import type { APIRequest, APIResponse } from '../../../types/api';
import { WebhookManager } from './WebhookManager';

export class WebhookRouter {
  private webhookManager: WebhookManager;

  constructor() {
    this.webhookManager = WebhookManager.getInstance();
  }

  async handleWebhook(request: APIRequest): Promise<APIResponse> {
    try {
      const { type, payload } = request.body as any;
      
      // Store webhook event
      await this.storeWebhookEvent(type, payload);
      
      return {
        status: 200,
        body: { success: true },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: { error: error.message },
      };
    }
  }

  private async storeWebhookEvent(type: string, payload: unknown): Promise<void> {
    // Implementation would store the event in the database
    // This will trigger the webhook listener via Supabase realtime
  }
}