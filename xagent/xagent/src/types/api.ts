import { z } from 'zod';

export const APIRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  path: z.string(),
  headers: z.record(z.string()).optional(),
  query: z.record(z.unknown()).optional(),
  body: z.unknown().optional(),
});

export const APIResponseSchema = z.object({
  status: z.number(),
  body: z.unknown(),
  headers: z.record(z.string()).optional(),
});

export type APIRequest = z.infer<typeof APIRequestSchema>;
export type APIResponse = z.infer<typeof APIResponseSchema>;