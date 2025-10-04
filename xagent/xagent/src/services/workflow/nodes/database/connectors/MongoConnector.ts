import { DatabaseConnector, DatabaseConfig } from './DatabaseConnector';

export class MongoConnector implements DatabaseConnector {
  private client: any = null;
  private db: any = null;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      const { MongoClient } = await import('mongodb');
      const url = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      this.client = await MongoClient.connect(url, config.options);
      this.db = this.client.db(config.database);
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async query(query: string, params?: unknown[]): Promise<unknown> {
    if (!this.db) throw new Error('Not connected to MongoDB');
    return this.db.collection(params?.[0] as string).find(JSON.parse(query)).toArray();
  }

  async execute(query: string, params?: unknown[]): Promise<unknown> {
    if (!this.db) throw new Error('Not connected to MongoDB');
    const operation = JSON.parse(query);
    return this.db.collection(params?.[0] as string).insertOne(operation);
  }

  isConnected(): boolean {
    return this.client?.isConnected?.() || false;
  }
}