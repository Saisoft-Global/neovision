import { z } from 'zod';

export const FeedbackEntrySchema = z.object({
  id: z.string(),
  type: z.enum([
    'entity_correction',
    'relation_feedback',
    'document_relevance',
    'response_quality'
  ]),
  userId: z.string(),
  timestamp: z.date(),
  entityId: z.string().optional(),
  relationId: z.string().optional(),
  documentId: z.string().optional(),
  score: z.number().min(0).max(1).optional(),
  corrections: z.record(z.unknown()).optional(),
  comments: z.string().optional(),
});

export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;