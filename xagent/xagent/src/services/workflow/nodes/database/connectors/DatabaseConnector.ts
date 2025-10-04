import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  type: z.enum(['postgres', 'mysql', 'mongodb', 'custom']),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().optional(),
  options: z.record(z.unknown()).optional(),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export interface DatabaseConnector {
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  query(query: string, params?: unknown[]): Promise<unknown>;
  execute(query: string, params?: unknown[]): Promise<unknown>;
  isConnected(): boolean;
}