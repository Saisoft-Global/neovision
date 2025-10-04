import { FeedbackCollector } from './FeedbackCollector';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';
import { DocumentProcessor } from '../knowledge/document/DocumentProcessor';
import type { FeedbackEntry } from '../../types/feedback';

export class FeedbackProcessor {
  private feedbackCollector: FeedbackCollector;
  private graphManager: KnowledgeGraphManager;
  private documentProcessor: DocumentProcessor;

  constructor() {
    this.feedbackCollector = FeedbackCollector.getInstance();
    this.graphManager = new KnowledgeGraphManager();
    this.documentProcessor = new DocumentProcessor();
  }

  async processFeedback(type: string): Promise<void> {
    const feedback = await this.feedbackCollector.getFeedbackByType(type);
    
    switch (type) {
      case 'entity_correction':
        await this.processEntityCorrections(feedback);
        break;
      case 'relation_feedback':
        await this.processRelationFeedback(feedback);
        break;
      case 'document_relevance':
        await this.processRelevanceFeedback(feedback);
        break;
      default:
        throw new Error(`Unknown feedback type: ${type}`);
    }
  }

  private async processEntityCorrections(feedback: FeedbackEntry[]): Promise<void> {
    for (const entry of feedback) {
      await this.graphManager.entityManager.updateEntity(
        entry.entityId,
        entry.corrections
      );
    }
  }

  private async processRelationFeedback(feedback: FeedbackEntry[]): Promise<void> {
    for (const entry of feedback) {
      await this.graphManager.relationManager.updateRelation(
        entry.relationId,
        entry.corrections
      );
    }
  }

  private async processRelevanceFeedback(feedback: FeedbackEntry[]): Promise<void> {
    // Update document relevance scores and re-process if needed
    for (const entry of feedback) {
      if (entry.score < 0.5) {
        await this.documentProcessor.reprocessDocument(entry.documentId);
      }
    }
  }
}