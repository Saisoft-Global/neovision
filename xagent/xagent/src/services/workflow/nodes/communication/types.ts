import { z } from 'zod';

export const CommunicationConfigSchema = z.object({
  type: z.enum(['email', 'slack', 'teams', 'sms', 'whatsapp']),
  operation: z.string(),
  parameters: z.record(z.unknown()),
  credentials: z.record(z.string()),
});

export type CommunicationConfig = z.infer<typeof CommunicationConfigSchema>;

export interface CommunicationConnector {
  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Record<string, unknown>): Promise<unknown>;
  isConnected(): boolean;
}