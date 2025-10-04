import { EventEmitter } from '../../utils/events/EventEmitter';
import { isServiceConfigured } from '../../config/environment';

export class Neo4jClient {
  private static instance: Neo4jClient | null = null;
  private driver: any = null;
  private connectionError: string | null = null;
  private eventEmitter: EventEmitter;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): Neo4jClient | null {
    if (!isServiceConfigured('neo4j')) {
      console.warn('Neo4j is not configured. Graph database features will be disabled.');
      return null;
    }

    if (!this.instance) {
      this.instance = new Neo4jClient();
    }
    return this.instance;
  }

  async connect(): Promise<void> {
    if (this.driver) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeConnection();
    return this.initPromise;
  }

  private async initializeConnection(): Promise<void> {
    try {
      const neo4j = await import('neo4j-driver');
      this.driver = neo4j.default.driver(
        import.meta.env.VITE_NEO4J_URI.replace('bolt://', 'http://'),
        neo4j.default.auth.basic(
          import.meta.env.VITE_NEO4J_USER,
          import.meta.env.VITE_NEO4J_PASSWORD
        ),
        { encrypted: false }
      );
      
      // Test connection
      await this.driver.verifyConnectivity();
      this.connectionError = null;
      this.initialized = true;
      this.eventEmitter.emit('connected');
    } catch (error) {
      this.connectionError = error instanceof Error ? error.message : 'Failed to connect to Neo4j';
      this.driver = null;
      this.initialized = false;
      this.eventEmitter.emit('error', this.connectionError);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.initialized = false;
      this.eventEmitter.emit('disconnected');
    }
  }

  async executeQuery(query: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.driver) {
      await this.connect();
    }

    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed';
      this.eventEmitter.emit('error', message);
      throw error;
    } finally {
      await session.close();
    }
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  isConnected(): boolean {
    return this.initialized && Boolean(this.driver);
  }

  onConnected(callback: () => void): void {
    if (this.isConnected()) {
      callback();
    }
    this.eventEmitter.on('connected', callback);
  }

  onDisconnected(callback: () => void): void {
    this.eventEmitter.on('disconnected', callback);
  }

  onError(callback: (error: string) => void): void {
    if (this.connectionError) {
      callback(this.connectionError);
    }
    this.eventEmitter.on('error', callback);
  }
}

export const neo4jClient = Neo4jClient.getInstance();
export default neo4jClient;