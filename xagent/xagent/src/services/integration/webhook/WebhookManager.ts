import { getSupabaseClient } from '../../../config/supabase';
import { EventEmitter } from 'events';

export class WebhookManager {
  private static instance: WebhookManager;
  private supabase;
  private eventEmitter: EventEmitter;
  private handlers: Map<string, Set<(payload: unknown) => Promise<void>>>;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.eventEmitter = new EventEmitter();
    this.handlers = new Map();
    this.initializeWebhookListener();
  }

  public static getInstance(): WebhookManager {
    if (!this.instance) {
      this.instance = new WebhookManager();
    }
    return this.instance;
  }

  private initializeWebhookListener(): void {
    this.supabase
      .channel('webhooks')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'webhook_events' },
        (payload) => {
          this.processWebhookEvent(payload.new);
        }
      )
      .subscribe();
  }

  async registerWebhook(
    eventType: string,
    handler: (payload: unknown) => Promise<void>
  ): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  async unregisterWebhook(
    eventType: string,
    handler: (payload: unknown) => Promise<void>
  ): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private async processWebhookEvent(event: any): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler => handler(event.payload))
      );
    }
  }
}