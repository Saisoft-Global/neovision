import { z } from 'zod';

export const FileOperationConfigSchema = z.object({
  operation: z.enum(['read', 'write', 'delete', 'move', 'transform']),
  path: z.string(),
  content: z.string().optional(),
  destination: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export type FileOperationConfig = z.infer<typeof FileOperationConfigSchema>;

export interface FileOperationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}