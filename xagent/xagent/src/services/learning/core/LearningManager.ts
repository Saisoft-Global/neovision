import { EventEmitter } from '../../../utils/events/EventEmitter';
import { FeedbackProcessor } from '../../feedback/FeedbackProcessor';
import { KnowledgeGraphManager } from '../../knowledge/graph/KnowledgeGraphManager';
import type { FeedbackEntry } from '../../../types/feedback';

export class LearningManager {
  private static instance: LearningManager;
  private eventEmitter: EventEmitter;
  private feedbackProcessor: FeedbackProcessor;
  private graphManager: KnowledgeGraphManager;
  private learningInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.feedbackProcessor = new FeedbackProcessor();
    this.graphManager = new KnowledgeGraphManager();
    this.initializeLearningCycle();
  }

  // Rest of the implementation remains the same...
}