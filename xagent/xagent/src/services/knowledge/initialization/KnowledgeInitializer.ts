import { VectorStoreInitializer } from '../../vectorization/VectorStoreInitializer';
import { EventEmitter } from '../../../utils/events/EventEmitter';

export class KnowledgeInitializer {
  private static instance: KnowledgeInitializer | null = null;
  private eventEmitter: EventEmitter;
  private vectorStoreInitializer: VectorStoreInitializer;
  private _initialized: boolean = false;
  private _error: string | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.vectorStoreInitializer = VectorStoreInitializer.getInstance();
  }

  public static getInstance(): KnowledgeInitializer {
    if (!this.instance) {
      this.instance = new KnowledgeInitializer();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      // Initialize vector store
      await this.vectorStoreInitializer.initialize();
      
      this._initialized = true;
      this._error = null;
      this.eventEmitter.emit('initialized');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Knowledge initialization failed';
      this.eventEmitter.emit('error', this._error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  getError(): string | null {
    return this._error;
  }

  onInitialized(callback: () => void): void {
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }
}