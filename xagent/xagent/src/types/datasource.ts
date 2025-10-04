import { z } from 'zod';

export const DataSourceConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  region: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const DataSourceTypeSchema = z.enum(['sql', 'nosql', 'cloud']);

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;