import { supabase } from '../../config/supabase';
import type { Workflow } from '../../types/workflow';
import { WorkflowOrchestrator } from './WorkflowOrchestrator';
import { TriggerManager } from './triggers/TriggerManager';
import { EventBus } from '../events/EventBus';

export class WorkflowManager {
  private static instance: WorkflowManager;
  private orchestrator: WorkflowOrchestrator;
  private triggerManager: TriggerManager;
  private eventBus: EventBus;

  private constructor() {
    this.orchestrator = WorkflowOrchestrator.getInstance();
    this.triggerManager = TriggerManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.initialize();
  }

  public static getInstance(): WorkflowManager {
    if (!this.instance) {
      this.instance = new WorkflowManager();
    }
    return this.instance;
  }

  private async initialize(): Promise<void> {
    await this.triggerManager.initialize();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.orchestrator.onWorkflowCompleted(({ workflowId, results }) => {
      this.eventBus.emit('workflowSuccess', { workflowId, results });
    });

    this.orchestrator.onWorkflowError(({ workflowId, error }) => {
      this.eventBus.emit('workflowError', { workflowId, error });
    });
  }

  async listWorkflows(): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name: workflow.name || 'New Workflow',
        description: workflow.description || '',
        nodes: workflow.nodes || [],
        connections: workflow.connections || [],
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async executeWorkflow(id: string, context: Record<string, unknown> = {}): Promise<void> {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!workflow) throw new Error('Workflow not found');

    await this.orchestrator.executeWorkflow(workflow, context);
  }

  onWorkflowSuccess(callback: (data: { workflowId: string; results: Record<string, unknown> }) => void): void {
    this.eventBus.on('workflowSuccess', callback);
  }

  onWorkflowError(callback: (data: { workflowId: string; error: string }) => void): void {
    this.eventBus.on('workflowError', callback);
  }
}