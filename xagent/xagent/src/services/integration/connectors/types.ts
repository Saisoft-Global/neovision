import type { z } from 'zod';

export interface IntegrationConfig {
  type: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface IntegrationProvider {
  connect(config: IntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  executeAction(action: string, params: Record<string, unknown>): Promise<unknown>;
}