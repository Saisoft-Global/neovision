import { z } from 'zod';

export const CloudCredentialsSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  region: z.string().optional(),
  projectId: z.string().optional(),
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export const CloudServiceConfigSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  service: z.string(),
  operation: z.string(),
  parameters: z.record(z.unknown()),
  credentials: CloudCredentialsSchema,
});

export type CloudCredentials = z.infer<typeof CloudCredentialsSchema>;
export type CloudServiceConfig = z.infer<typeof CloudServiceConfigSchema>;

export interface CloudServiceConnector {
  connect(credentials: CloudCredentials): Promise<void>;
  disconnect(): Promise<void>;
  executeOperation(service: string, operation: string, params: Record<string, unknown>): Promise<unknown>;
  isConnected(): boolean;
}