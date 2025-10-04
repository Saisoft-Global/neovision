import { z } from 'zod';

export const AgentMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  recipientId: z.string().optional(),
  topic: z.string(),
  type: z.enum(['task', 'response', 'notification', 'error']),
  content: z.unknown(),
  timestamp: z.date(),
  priority: z.number().min(0).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;