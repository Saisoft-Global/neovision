import { z } from 'zod';

export const TrainingDatasetSchema = z.object({
  name: z.string(),
  description: z.string(),
  data: z.string(),
  metadata: z.object({
    size: z.number(),
    type: z.string(),
    uploadedAt: z.date(),
  }),
});

export type TrainingDataset = z.infer<typeof TrainingDatasetSchema>;