import { EventEmitter } from 'events';
import { KnowledgeVersionManager } from '../versioning/KnowledgeVersionManager';
import { KnowledgeGraphManager } from '../graph/KnowledgeGraphManager';
import { FeedbackProcessor } from '../../feedback/FeedbackProcessor';
import { UpdateValidator } from '../realtime/UpdateValidator';
import type { KnowledgeUpdate } from '../../../types/knowledge';

export class ContinuousLearningManager {
  private static instance: ContinuousLearningManager;
  private versionManager: KnowledgeVersionManager;
  private graphManager: KnowledgeGraphManager;
  private feedbackProcessor: FeedbackProcessor;
  private validator: UpdateValidator;
  private eventEmitter: EventEmitter;
  private learningInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.versionManager = KnowledgeVersionManager.getInstance();
    this.graphManager = new KnowledgeGraphManager();
    this.feedbackProcessor = new FeedbackProcessor();
    this.validator = new UpdateValidator();
    this.eventEmitter = new EventEmitter();
    this.initializeLearningCycle();
  }

  public static getInstance(): ContinuousLearningManager {
    if (!this.instance) {
      this.instance = new ContinuousLearningManager();
    }
    return this.instance;
  }

  private initializeLearningCycle(): void {
    setInterval(() => {
      this.runLearningCycle();
    }, this.learningInterval);
  }

  private async runLearningCycle(): Promise<void> {
    try {
      // Process feedback and updates
      const updates = await this.collectUpdates();
      const validatedUpdates = await this.validateUpdates(updates);

      // Apply validated updates to knowledge graph
      for (const update of validatedUpdates) {
        await this.applyUpdate(update);
      }

      // Create new version if significant changes
      if (validatedUpdates.length > 0) {
        const { nodes, relations } = await this.graphManager.getCurrentState();
        await this.versionManager.createVersion(nodes, relations, {
          updateCount: validatedUpdates.length,
          timestamp: new Date(),
        });
      }

      this.eventEmitter.emit('learning.complete', {
        updatesProcessed: validatedUpdates.length,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Learning cycle error:', error);
      this.eventEmitter.emit('learning.error', error);
    }
  }

  private async collectUpdates(): Promise<KnowledgeUpdate[]> {
    // Collect updates from various sources
    const [feedbackUpdates, userActionUpdates, externalUpdates] = await Promise.all([
      this.feedbackProcessor.getRecentFeedback(),
      this.feedbackProcessor.getRecentUserActions(),
      this.feedbackProcessor.getExternalUpdates(),
    ]);

    return [...feedbackUpdates, ...userActionUpdates, ...externalUpdates];
  }

  private async validateUpdates(updates: KnowledgeUpdate[]): Promise<KnowledgeUpdate[]> {
    const validatedUpdates: KnowledgeUpdate[] = [];

    for (const update of updates) {
      const validation = await this.validator.validateUpdate(update);
      if (validation.isValid && validation.confidence > 0.8) {
        validatedUpdates.push(update);
      }
    }

    return validatedUpdates;
  }

  private async applyUpdate(update: KnowledgeUpdate): Promise<void> {
    // Check for conflicts
    const currentState = await this.graphManager.getCurrentState();
    const conflicts = await this.validator.detectConflicts(update, currentState);

    if (conflicts.hasConflicts) {
      this.eventEmitter.emit('update.conflict', {
        update,
        conflicts: conflicts.conflicts,
      });
      return;
    }

    // Apply update to knowledge graph
    await this.graphManager.updateGraph(update.content);
    this.eventEmitter.emit('update.applied', update);
  }

  public onLearningComplete(callback: (result: any) => void): void {
    this.eventEmitter.on('learning.complete', callback);
  }

  public onLearningError(callback: (error: any) => void): void {
    this.eventEmitter.on('learning.error', callback);
  }

  public onUpdateConflict(callback: (data: any) => void): void {
    this.eventEmitter.on('update.conflict', callback);
  }
}