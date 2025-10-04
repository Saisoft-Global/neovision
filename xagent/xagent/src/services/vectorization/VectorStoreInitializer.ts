import { getVectorStore } from '../pinecone/client';
import { EventEmitter } from '../../utils/events/EventEmitter';
import { isServiceConfigured } from '../../config/environment';

export class VectorStoreInitializer {
  private static instance: VectorStoreInitializer | null = null;
  private eventEmitter: EventEmitter;
  private _initialized: boolean = false;
  private _error: string | null = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): VectorStoreInitializer {
    if (!this.instance) {
      this.instance = new VectorStoreInitializer();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeVectorStore();
    return this.initializationPromise;
  }

  private async initializeVectorStore(): Promise<void> {
    try {
      // Check if OpenAI is configured first
      if (!isServiceConfigured('openai')) {
        this._error = 'OpenAI API key not configured. Vector store features will be limited.';
        this.eventEmitter.emit('error', this._error);
        return;
      }

      // Then check Pinecone
      if (!isServiceConfigured('pinecone')) {
        this._error = 'Pinecone configuration missing. Vector store features will be disabled.';
        this.eventEmitter.emit('error', this._error);
        return;
      }

      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }

      // Verify connection by getting index stats
      await vectorStore.describeIndexStats();

      this._initialized = true;
      this._error = null;
      this.eventEmitter.emit('initialized');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Vector store initialization failed';
      this.eventEmitter.emit('error', this._error);
      throw error;
    } finally {
      this.initializationPromise = null;
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