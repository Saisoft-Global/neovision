import { DatabaseConnector, DatabaseConfig } from './DatabaseConnector';
import { supabase } from '../../../../../config/supabase';

export class PostgresConnector implements DatabaseConnector {
  private connected = false;

  async connect(config: DatabaseConfig): Promise<void> {
    // For Supabase/Postgres, we're already connected via the client
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query(query: string, params?: unknown[]): Promise<unknown> {
    const { data, error } = await supabase.rpc(query, params);
    if (error) throw error;
    return data;
  }

  async execute(query: string, params?: unknown[]): Promise<unknown> {
    const { data, error } = await supabase.rpc(query, params);
    if (error) throw error;
    return data;
  }

  isConnected(): boolean {
    return this.connected;
  }
}