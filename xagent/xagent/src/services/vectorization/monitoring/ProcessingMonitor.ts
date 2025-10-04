import { EventEmitter } from '../../../utils/events/EventEmitter';
import type { Document } from '../../../types/document';

export class ProcessingMonitor {
  private eventEmitter: EventEmitter;
  private processingQueue: Map<string, boolean>;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.processingQueue = new Map();
  }

  // Rest of the implementation remains the same...
}