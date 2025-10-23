import { Pinecone } from '@pinecone-database/pinecone';
import { isServiceConfigured } from '../../config/environment';
import { getPineconeConfig } from './config';
import { EventEmitter } from '../../utils/events/EventEmitter';

export class PineconeClient {
  private static instance: Pinecone | null = null;
  private static index: any = null;
  private static indexInitialized = false;
  private static initializationError: string | null = null;
  private static initializationPromise: Promise<void> | null = null;
  private static eventEmitter = new EventEmitter();

  private constructor() {}

  public static async getInstance(): Promise<Pinecone | null> {
    if (!isServiceConfigured('pinecone')) {
      this.initializationError = 'Pinecone is not configured. Vector store features will be disabled.';
      this.eventEmitter.emit('error', this.initializationError);
      return null;
    }

    if (!this.instance && !this.initializationError) {
      try {
        const config = getPineconeConfig();
        // Pinecone v1 API still requires environment parameter
        this.instance = new Pinecone({
          apiKey: config.apiKey,
          environment: config.environment
        });
        this.eventEmitter.emit('initialized');
      } catch (error) {
        this.initializationError = error instanceof Error 
          ? error.message 
          : 'Failed to initialize Pinecone client';
        this.eventEmitter.emit('error', this.initializationError);
        this.instance = null;
      }
    }
    return this.instance;
  }

  public static async getIndex() {
    if (this.initializationError || !this.instance) {
      return null;
    }

    if (!this.indexInitialized && !this.initializationPromise) {
      this.initializationPromise = this.initializeIndex();
    }

    try {
      await this.initializationPromise;
      return this.index;
    } catch (error) {
      console.error('Failed to get Pinecone index:', error);
      return null;
    }
  }

  private static async initializeIndex(): Promise<void> {
    try {
      const config = getPineconeConfig();
      this.index = this.instance!.index(config.indexName);
      
      // Verify connection by getting index stats
      await this.index.describeIndexStats();
      
      this.indexInitialized = true;
      this.initializationError = null;
      this.eventEmitter.emit('indexInitialized');
    } catch (error) {
      this.initializationError = error instanceof Error 
        ? error.message 
        : 'Failed to initialize Pinecone index';
      this.eventEmitter.emit('error', this.initializationError);
      this.index = null;
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  public static getInitializationError(): string | null {
    return this.initializationError;
  }

  public static isInitialized(): boolean {
    return this.indexInitialized && !this.initializationError;
  }

  public static reset(): void {
    this.instance = null;
    this.index = null;
    this.indexInitialized = false;
    this.initializationError = null;
    this.initializationPromise = null;
  }

  public static onInitialized(callback: () => void): void {
    this.eventEmitter.on('initialized', callback);
  }

  public static onIndexInitialized(callback: () => void): void {
    this.eventEmitter.on('indexInitialized', callback);
  }

  public static onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }

  // Vector store operations
  public static async query(params: any) {
    const index = await this.getIndex();
    if (!index) {
      throw new Error('Vector store not available');
    }
    return index.query(params);
  }

  public static async upsert(vectors: any[]) {
    const index = await this.getIndex();
    if (!index) {
      throw new Error('Vector store not available');
    }
    return index.upsert(vectors);
  }

  public static async delete(filter: any) {
    const index = await this.getIndex();
    if (!index) {
      throw new Error('Vector store not available');
    }
    return index.deleteMany(filter);
  }
}