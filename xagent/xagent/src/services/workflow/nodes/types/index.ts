import { z } from 'zod';

// Base node configuration
export const BaseNodeConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.unknown()),
});

// HTTP Request node
export const HttpRequestConfigSchema = BaseNodeConfigSchema.extend({
  type: z.literal('httpRequest'),
  parameters: z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
    authentication: z.object({
      type: z.enum(['none', 'basic', 'bearer', 'oauth2']),
      credentials: z.record(z.unknown()),
    }).optional(),
  }),
});

// Database Operation node
export const DatabaseConfigSchema = BaseNodeConfigSchema.extend({
  type: z.literal('database'),
  parameters: z.object({
    operation: z.enum(['query', 'insert', 'update', 'delete']),
    connection: z.object({
      type: z.enum(['postgres', 'mysql', 'mongodb']),
      config: z.record(z.unknown()),
    }),
    query: z.string(),
    variables: z.record(z.unknown()).optional(),
  }),
});

// File Operation node
export const FileOperationConfigSchema = BaseNodeConfigSchema.extend({
  type: z.literal('fileOperation'),
  parameters: z.object({
    operation: z.enum(['read', 'write', 'delete', 'move']),
    path: z.string(),
    content: z.string().optional(),
    encoding: z.string().optional(),
  }),
});

// Code Execution node
export const CodeExecutionConfigSchema = BaseNodeConfigSchema.extend({
  type: z.literal('codeExecution'),
  parameters: z.object({
    language: z.enum(['javascript', 'python', 'shell']),
    code: z.string(),
    environment: z.record(z.string()).optional(),
  }),
});

export type NodeConfig = z.infer<typeof BaseNodeConfigSchema>;
export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type FileOperationConfig = z.infer<typeof FileOperationConfigSchema>;
export type CodeExecutionConfig = z.infer<typeof CodeExecutionConfigSchema>;