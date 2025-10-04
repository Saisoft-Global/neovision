import { z } from 'zod';

export const EmailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  to: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })),
  content: z.string(),
  timestamp: z.date(),
  threadId: z.string().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
  })).optional(),
  meetingReference: z.object({
    meetingId: z.string(),
    type: z.enum(['invitation', 'update', 'cancellation', 'minutes', 'agenda']),
  }).optional(),
  status: z.enum(['received', 'draft', 'sent', 'archived']),
  labels: z.array(z.string()).optional(),
});

export type Email = z.infer<typeof EmailSchema>;