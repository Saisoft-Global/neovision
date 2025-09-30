import { api } from './config';

export type TriggerType = 'email' | 'folder' | 'webhook' | 'manual';
export type ActionType = 'process_document' | 'send_to_erp' | 'send_webhook' | 'send_email' | 'save_to_database' | 'notify_user';

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, any>;
  conditions?: Record<string, any>;
}

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, any>;
  conditions?: Record<string, any>;
  delay_seconds?: number;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled?: boolean;
  user_id: string;
  organization_id: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  execution_count: number;
  success_count: number;
  error_count: number;
}

export async function createWorkflow(workflow: WorkflowCreate) {
  const res = await api.post('/workflows/workflows', workflow);
  return res.data;
}

export async function listWorkflows(userId: string, limit = 20, offset = 0) {
  const res = await api.get('/workflows/workflows', { 
    params: { user_id: userId, limit, offset } 
  });
  return res.data as {
    total: number;
    limit: number;
    offset: number;
    workflows: Workflow[];
  };
}

export async function getWorkflow(workflowId: string, userId: string) {
  const res = await api.get(`/workflows/workflows/${workflowId}`, {
    params: { user_id: userId }
  });
  return res.data as Workflow;
}

export async function updateWorkflow(workflowId: string, updates: Partial<WorkflowCreate>, userId: string) {
  const res = await api.put(`/workflows/workflows/${workflowId}`, updates, {
    params: { user_id: userId }
  });
  return res.data;
}

export async function deleteWorkflow(workflowId: string, userId: string) {
  const res = await api.delete(`/workflows/workflows/${workflowId}`, {
    params: { user_id: userId }
  });
  return res.data;
}

export async function executeWorkflow(workflowId: string, triggerData: Record<string, any>) {
  const res = await api.post(`/workflows/workflows/${workflowId}/execute`, triggerData);
  return res.data;
}

export async function listWorkflowExecutions(workflowId: string, userId: string, limit = 20, offset = 0) {
  const res = await api.get(`/workflows/workflows/${workflowId}/executions`, {
    params: { user_id: userId, limit, offset }
  });
  return res.data as {
    total: number;
    limit: number;
    offset: number;
    executions: any[];
  };
}
