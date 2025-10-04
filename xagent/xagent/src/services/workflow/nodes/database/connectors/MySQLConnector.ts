import { DatabaseConnector, DatabaseConfig } from './DatabaseConnector';

export class MySQLConnector implements DatabaseConnector {
  private connection: any = null;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      const mysql = await import('mysql2/promise');
      this.connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
        ...config.options,
      });
    } catch (error) {
      console.error('MySQL connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async query(query: string, params?: unknown[]): Promise<unknown> {
    if (!this.connection) throw new Error('Not connected to MySQL');
    const [rows] = await this.connection.execute(query, params);
    return rows;
  }

  async execute(query: string, params?: unknown[]): Promise<unknown> {
    if (!this.connection) throw new Error('Not connected to MySQL');
    const [result] = await this.connection.execute(query, params);
    return result;
  }

  isConnected(): boolean {
    return Boolean(this.connection);
  }
}