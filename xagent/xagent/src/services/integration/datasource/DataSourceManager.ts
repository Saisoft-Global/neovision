import { createClient } from '@supabase/supabase-js';
import { SQLConnector } from './connectors/SQLConnector';
import { NoSQLConnector } from './connectors/NoSQLConnector';
import { CloudConnector } from './connectors/CloudConnector';
import type { DataSourceConfig, DataSourceType } from '../../../types/datasource';

export class DataSourceManager {
  private static instance: DataSourceManager;
  private supabase;
  private connectors: Map<DataSourceType, any>;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.connectors = new Map();
    this.initializeConnectors();
  }

  public static getInstance(): DataSourceManager {
    if (!this.instance) {
      this.instance = new DataSourceManager();
    }
    return this.instance;
  }

  private initializeConnectors(): void {
    this.connectors.set('sql', new SQLConnector());
    this.connectors.set('nosql', new NoSQLConnector());
    this.connectors.set('cloud', new CloudConnector());
  }

  async connect(type: DataSourceType, config: DataSourceConfig): Promise<void> {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new Error(`Unsupported data source type: ${type}`);
    }

    await connector.connect(config);
    await this.storeConnection(type, config);
  }

  async query(sourceId: string, query: string): Promise<unknown> {
    const source = await this.getConnection(sourceId);
    const connector = this.connectors.get(source.type);
    return connector.query(query);
  }

  async listSources(): Promise<unknown[]> {
    const { data, error } = await this.supabase
      .from('data_sources')
      .select('*');

    if (error) throw error;
    return data;
  }

  private async storeConnection(type: DataSourceType, config: DataSourceConfig): Promise<void> {
    const { error } = await this.supabase
      .from('data_sources')
      .insert({
        type,
        config: this.sanitizeConfig(config),
        status: 'connected',
      });

    if (error) throw error;
  }

  private async getConnection(id: string): Promise<{ type: DataSourceType; config: DataSourceConfig }> {
    const { data, error } = await this.supabase
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  private sanitizeConfig(config: DataSourceConfig): Partial<DataSourceConfig> {
    // Remove sensitive information before storing
    const { password, apiKey, ...safeConfig } = config;
    return safeConfig;
  }
}