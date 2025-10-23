interface WorkflowStep {
  type: 'url' | 'form' | 'facial' | 'desktop';
  action: string;
  params: any;
  next?: string;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  currentStep: number;
}

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private activeWorkflow: Workflow | null = null;

  createWorkflow(id: string, name: string, steps: WorkflowStep[]): Workflow {
    const workflow: Workflow = {
      id,
      name,
      steps,
      currentStep: 0,
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async startWorkflow(id: string, onStepComplete: (step: WorkflowStep) => void) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    this.activeWorkflow = workflow;
    await this.executeWorkflow(onStepComplete);
  }

  private async executeWorkflow(onStepComplete: (step: WorkflowStep) => void) {
    if (!this.activeWorkflow) return;

    while (this.activeWorkflow.currentStep < this.activeWorkflow.steps.length) {
      const step = this.activeWorkflow.steps[this.activeWorkflow.currentStep];
      await this.executeStep(step);
      onStepComplete(step);
      this.activeWorkflow.currentStep++;
    }

    this.activeWorkflow = null;
  }

  private async executeStep(step: WorkflowStep) {
    try {
      // Execute step based on type and action
      switch (step.type) {
        case 'agent':
          return await this.executeAgentStep(step);
        case 'condition':
          return await this.executeConditionStep(step);
        case 'data':
          return await this.executeDataStep(step);
        case 'notification':
          return await this.executeNotificationStep(step);
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      throw error;
    }
  }

  private async executeAgentStep(step: WorkflowStep): Promise<any> {
    // Execute agent-specific actions
    const { action, parameters } = step;
    
    switch (action) {
      case 'send_email':
        // Simulate email sending
        return { success: true, messageId: `email_${Date.now()}` };
      case 'process_document':
        // Simulate document processing
        return { success: true, processedAt: new Date().toISOString() };
      case 'create_task':
        // Simulate task creation
        return { success: true, taskId: `task_${Date.now()}` };
      default:
        return { success: true, result: `Executed ${action}` };
    }
  }

  private async executeConditionStep(step: WorkflowStep): Promise<any> {
    // Evaluate conditions
    const { parameters } = step;
    const condition = parameters?.condition || 'true';
    
    // Simple condition evaluation (in production, use a proper expression evaluator)
    try {
      // Basic condition evaluation without eval for security
      const result = this.evaluateCondition(condition, parameters);
      return { conditionMet: Boolean(result) };
    } catch {
      return { conditionMet: false, error: 'Invalid condition' };
    }
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluator without eval
    // This is a basic implementation - in production, use a proper expression parser
    
    // Handle simple boolean conditions
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Handle simple comparisons
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map(s => s.trim());
      return this.getContextValue(left, context) === this.getContextValue(right, context);
    }
    
    if (condition.includes('!==')) {
      const [left, right] = condition.split('!==').map(s => s.trim());
      return this.getContextValue(left, context) !== this.getContextValue(right, context);
    }
    
    if (condition.includes('>')) {
      const [left, right] = condition.split('>').map(s => s.trim());
      return Number(this.getContextValue(left, context)) > Number(this.getContextValue(right, context));
    }
    
    if (condition.includes('<')) {
      const [left, right] = condition.split('<').map(s => s.trim());
      return Number(this.getContextValue(left, context)) < Number(this.getContextValue(right, context));
    }
    
    // Default to true for unknown conditions
    return true;
  }

  private getContextValue(key: string, context: any): any {
    // Remove quotes if present
    key = key.replace(/['"]/g, '');
    
    // Check if it's a context variable
    if (context && key in context) {
      return context[key];
    }
    
    // Return the key as-is if not found in context
    return key;
  }

  private async executeDataStep(step: WorkflowStep): Promise<any> {
    // Execute data operations
    const { action, parameters } = step;
    
    switch (action) {
      case 'query_database':
        return { success: true, rows: [] };
      case 'update_record':
        return { success: true, updatedAt: new Date().toISOString() };
      case 'create_record':
        return { success: true, recordId: `record_${Date.now()}` };
      default:
        return { success: true, data: parameters };
    }
  }

  private async executeNotificationStep(step: WorkflowStep): Promise<any> {
    // Send notifications
    const { parameters } = step;
    
    // Simulate notification sending
    return {
      success: true,
      notificationId: `notif_${Date.now()}`,
      sentAt: new Date().toISOString()
    };
  }

  pauseWorkflow() {
    if (this.activeWorkflow) {
      // Implement pause logic
    }
  }

  resumeWorkflow() {
    if (this.activeWorkflow) {
      // Implement resume logic
    }
  }

  stopWorkflow() {
    this.activeWorkflow = null;
  }

  getWorkflowStatus(id: string) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }
    return {
      currentStep: workflow.currentStep,
      totalSteps: workflow.steps.length,
      isActive: this.activeWorkflow?.id === id,
    };
  }
} 