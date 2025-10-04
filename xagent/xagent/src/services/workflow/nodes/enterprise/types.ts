import { z } from 'zod';

export const EnterpriseCredentialsSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  instanceUrl: z.string().url(),
  environment: z.enum(['production', 'sandbox', 'development']),
});

export const EnterpriseConfigSchema = z.object({
  system: z.enum(['sap', 'salesforce', 'dynamics', 'oracle', 'custom']),
  operation: z.string(),
  entity: z.string(),
  action: z.string(),
  parameters: z.record(z.unknown()),
  credentials: EnterpriseCredentialsSchema,
});

export type EnterpriseCredentials = z.infer<typeof EnterpriseCredentialsSchema>;
export type EnterpriseConfig = z.infer<typeof EnterpriseConfigSchema>;

export interface EnterpriseConnector {
  connect(credentials: EnterpriseCredentials): Promise<void>;
  disconnect(): Promise<void>;
  execute(operation: string, params: Record<string, unknown>): Promise<unknown>;
  isConnected(): boolean;
}