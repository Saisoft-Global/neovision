import { z } from 'zod';

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  action: z.string(),
  parameters: z.record(z.unknown()),
  conditions: z.array(z.object({
    type: z.string(),
    value: z.unknown(),
  })).optional(),
});

export const WorkflowConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  startPoint: z.object({
    x: z.number(),
    y: z.number(),
  }),
  endPoint: z.object({
    x: z.number(),
    y: z.number(),
  }),
  midPoint: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  created_by: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

export interface WorkflowCondition {
  type: string;
  value: unknown;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  type: 'webhook' | 'schedule' | 'event';
  config: Record<string, unknown>;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowIntegration {
  id: string;
  workflow_id: string;
  service: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}