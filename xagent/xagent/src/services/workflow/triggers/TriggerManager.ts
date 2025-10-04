import { supabase } from '../../../config/supabase';
import type { WorkflowTrigger } from '../../../types/workflow';

export class TriggerManager {
  private static instance: TriggerManager;
  private scheduledTriggers: Map<string, NodeJS.Timeout>;
  private initialized: boolean = false;

  private constructor() {
    this.scheduledTriggers = new Map();
  }

  public static getInstance(): TriggerManager {
    if (!this.instance) {
      this.instance = new TriggerManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const { data: triggers } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('status', 'active');

      if (triggers) {
        for (const trigger of triggers) {
          await this.activateTrigger(trigger);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize triggers:', error);
    }
  }

  async addTrigger(workflowId: string, trigger: Partial<WorkflowTrigger>): Promise<WorkflowTrigger> {
    const { data, error } = await supabase
      .from('workflow_triggers')
      .insert({
        workflow_id: workflowId,
        type: trigger.type,
        config: trigger.config,
      })
      .select()
      .single();

    if (error) throw error;
    
    await this.activateTrigger(data);
    return data;
  }

  private async activateTrigger(trigger: WorkflowTrigger): Promise<void> {
    // Clear any existing trigger first
    this.clearTrigger(trigger.id);

    switch (trigger.type) {
      case 'schedule':
        await this.setupSchedule(trigger);
        break;
      case 'webhook':
        await this.setupWebhook(trigger);
        break;
      case 'event':
        await this.setupEventListener(trigger);
        break;
    }
  }

  private clearTrigger(triggerId: string): void {
    const existingTimeout = this.scheduledTriggers.get(triggerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.scheduledTriggers.delete(triggerId);
    }
  }

  private async setupSchedule(trigger: WorkflowTrigger): Promise<void> {
    const { cron } = trigger.config;
    if (!cron) return;

    const interval = this.parseCronToMs(cron);
    if (interval <= 0) return;

    const timeoutId = setTimeout(() => {
      this.executeTrigger(trigger);
      // Re-schedule after execution
      this.setupSchedule(trigger);
    }, interval);

    this.scheduledTriggers.set(trigger.id, timeoutId);
  }

  private async setupWebhook(trigger: WorkflowTrigger): Promise<void> {
    // Implementation for webhook setup
    // This would typically involve registering routes/handlers
  }

  private async setupEventListener(trigger: WorkflowTrigger): Promise<void> {
    // Implementation for event listener setup
    // This would typically involve subscribing to events
  }

  private async executeTrigger(trigger: WorkflowTrigger): Promise<void> {
    try {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', trigger.workflow_id)
        .single();

      if (workflow) {
        const { WorkflowExecutor } = await import('../execution/WorkflowExecutor');
        const executor = new WorkflowExecutor();
        await executor.execute(workflow);
      }
    } catch (error) {
      console.error('Failed to execute trigger:', error);
    }
  }

  private parseCronToMs(cron: string): number {
    // Simple cron parser - in production use a proper cron parser library
    // This is just a basic implementation that returns a reasonable default
    return 5 * 60 * 1000; // 5 minutes
  }

  cleanup(): void {
    for (const [triggerId, timeoutId] of this.scheduledTriggers) {
      clearTimeout(timeoutId);
      this.scheduledTriggers.delete(triggerId);
    }
  }
}