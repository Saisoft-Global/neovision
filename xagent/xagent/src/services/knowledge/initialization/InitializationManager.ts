import { EventEmitter } from '../../../utils/events/EventEmitter';
import { VectorStoreInitializer } from '../../vectorization/VectorStoreInitializer';
import { testDatabaseConnections } from '../../../utils/testConnections';

export class InitializationManager {
  private static instance: InitializationManager | null = null;
  private eventEmitter: EventEmitter;
  private vectorStoreInitializer: VectorStoreInitializer;
  private _initialized: boolean = false;
  private _error: string | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.vectorStoreInitializer = VectorStoreInitializer.getInstance();
  }

  public static getInstance(): InitializationManager {
    if (!this.instance) {
      this.instance = new InitializationManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Test all database connections first
      const connections = await testDatabaseConnections();
      
      if (!connections.supabase) {
        throw new Error('Supabase connection failed - required for core functionality');
      }

      // Initialize vector store if available
      if (connections.pinecone) {
        await this.vectorStoreInitializer.initialize();
      }

      this._initialized = true;
      this._error = null;
      this.eventEmitter.emit('initialized');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      this._error = message;
      this.eventEmitter.emit('error', message);
      throw error;
    } finally {
      this.initPromise = null;
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