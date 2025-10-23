export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  expertise: string[];
  isAvailable: boolean;
  personality?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export type AgentType = 'knowledge' | 'email' | 'meeting' | 'task' | 'desktop_automation' | 'tool_enabled' | 'direct_execution' | 'productivity';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'error' | 'action' | 'notification';
  metadata?: Record<string, unknown>;
}

export interface AgentRequest {
  type: string;
  action: string;
  payload: Record<string, unknown>;
  priority?: number;
}

export interface AgentResponse {
  success: boolean;
  data: unknown;
  error?: string;
  nextActions?: AgentRequest[];
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: string;
  input: string;
  agent: string;
  priority?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}