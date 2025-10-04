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
    // This method will be implemented to work with the AIAgent component
    // It will call the appropriate methods based on the step type and action
    throw new Error('Method not implemented');
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