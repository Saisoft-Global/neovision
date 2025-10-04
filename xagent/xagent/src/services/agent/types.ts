import type { AgentConfig } from '../../types/agent-framework';

export interface AgentResponse {
  success: boolean;
  data: unknown;
  error?: string;
  nextActions?: AgentRequest[];
}

export interface AgentRequest {
  type: string;
  action: string;
  payload: Record<string, unknown>;
  priority?: number;
}

export interface AgentContext {
  type: string;
  expertise: string[];
  personality?: Record<string, number>;
  metadata?: Record<string, unknown>;
}