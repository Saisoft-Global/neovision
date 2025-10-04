import { NodeExecutor } from '../executors/NodeExecutor';
import { DatabaseConnector, DatabaseConfig } from './connectors/DatabaseConnector';
import { PostgresConnector } from './connectors/PostgresConnector';
import { MongoConnector } from './connectors/MongoConnector';
import { MySQLConnector } from './connectors/MySQLConnector';

interface DatabaseNodeConfig {
  type: string;
  operation: 'query' | 'execute';
  config: DatabaseConfig;
  query: string;
  params?: unknown[];
}

export class DatabaseNodeExecutor extends NodeExecutor<DatabaseNodeConfig> {
  private connectors: Map<string, DatabaseConnector>;

  constructor() {
    super();
    this.connectors = new Map();
    this.registerConnectors();
  }

  private registerConnectors() {
    this.connectors.set('postgres', new PostgresConnector());
    this.connectors.set('mongodb', new MongoConnector());
    this.connectors.set('mysql', new MySQLConnector());
  }

  async execute(config: DatabaseNodeConfig): Promise<unknown> {
    const connector = this.connectors.get(config.type);
    if (!connector) {
      throw new Error(`No connector found for database type: ${config.type}`);
    }

    try {
      if (!connector.isConnected()) {
        await connector.connect(config.config);
      }

      if (config.operation === 'query') {
        return await connector.query(config.query, config.params);
      } else {
        return await connector.execute(config.query, config.params);
      }
    } catch (error) {
      console.error('Database operation error:', error);
      throw error;
    }
  }
}