import { EventEmitter } from 'events';
import { KnowledgeGraphManager } from '../graph/KnowledgeGraphManager';
import { FeedbackProcessor } from '../../feedback/FeedbackProcessor';
import { WebhookManager } from '../../integration/webhook/WebhookManager';
import type { KnowledgeUpdate } from '../../../types/knowledge';

export class KnowledgeStreamProcessor {
  private static instance: KnowledgeStreamProcessor;
  private graphManager: KnowledgeGraphManager;
  private feedbackProcessor: FeedbackProcessor;
  private webhookManager: WebhookManager;
  private eventEmitter: EventEmitter;

  private constructor() {
    this.graphManager = new KnowledgeGraphManager();
    this.feedbackProcessor = new FeedbackProcessor();
    this.webhookManager = WebhookManager.getInstance();
    this.eventEmitter = new EventEmitter();
    this.initializeEventHandlers();
  }

  public static getInstance(): KnowledgeStreamProcessor {
    if (!this.instance) {
      this.instance = new KnowledgeStreamProcessor();
    }
    return this.instance;
  }

  private initializeEventHandlers(): void {
    // Handle feedback events
    this.webhookManager.registerWebhook('feedback.submitted', async (payload) => {
      await this.processFeedbackUpdate(payload as any);
    });

    // Handle user action events
    this.webhookManager.registerWebhook('user.action', async (payload) => {
      await this.processUserAction(payload as any);
    });

    // Handle external data updates
    this.webhookManager.registerWebhook('data.update', async (payload) => {
      await this.processExternalUpdate(payload as any);
    });
  }

  private async processFeedbackUpdate(feedback: any): Promise<void> {
    const update: KnowledgeUpdate = {
      type: 'feedback',
      source: feedback.userId,
      content: feedback.content,
      metadata: {
        feedbackType: feedback.type,
        score: feedback.score,
      },
      timestamp: new Date(),
    };

    await this.updateKnowledgeGraph(update);
  }

  private async processUserAction(action: any): Promise<void> {
    const update: KnowledgeUpdate = {
      type: 'user_action',
      source: action.userId,
      content: action.description,
      metadata: {
        actionType: action.type,
        context: action.context,
      },
      timestamp: new Date(),
    };

    await this.updateKnowledgeGraph(update);
  }

  private async processExternalUpdate(data: any): Promise<void> {
    const update: KnowledgeUpdate = {
      type: 'external',
      source: data.provider,
      content: data.content,
      metadata: data.metadata,
      timestamp: new Date(),
    };

    await this.updateKnowledgeGraph(update);
  }

  private async updateKnowledgeGraph(update: KnowledgeUpdate): Promise<void> {
    try {
      await this.graphManager.updateGraph(update.content);
      this.eventEmitter.emit('knowledge.updated', update);
    } catch (error) {
      console.error('Failed to update knowledge graph:', error);
      this.eventEmitter.emit('knowledge.error', { update, error });
    }
  }

  public onKnowledgeUpdated(callback: (update: KnowledgeUpdate) => void): void {
    this.eventEmitter.on('knowledge.updated', callback);
  }

  public onKnowledgeError(callback: (error: any) => void): void {
    this.eventEmitter.on('knowledge.error', callback);
  }
}