import type { DatabaseConfig } from '../types';
import { NodeExecutor } from './NodeExecutor';
import { supabase } from '../../../../config/supabase';

export class DatabaseExecutor extends NodeExecutor<DatabaseConfig> {
  async execute(config: DatabaseConfig): Promise<unknown> {
    const { operation, connection, query, variables } = config.parameters;

    // For now, we'll only support Supabase operations
    switch (operation) {
      case 'query':
        const { data, error } = await supabase.rpc(query, variables);
        if (error) throw error;
        return data;

      case 'insert':
        return supabase
          .from(connection.config.table)
          .insert(variables)
          .select();

      case 'update':
        return supabase
          .from(connection.config.table)
          .update(variables.updates)
          .match(variables.match)
          .select();

      case 'delete':
        return supabase
          .from(connection.config.table)
          .delete()
          .match(variables.match);

      default:
        throw new Error(`Unsupported database operation: ${operation}`);
    }
  }
}