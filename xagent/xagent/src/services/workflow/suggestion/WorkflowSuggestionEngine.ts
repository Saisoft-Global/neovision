import { createChatCompletion } from '../../openai/chat';
import type { Workflow } from '../../../types/workflow';
import { WorkflowGenerator } from '../WorkflowGenerator';

export class WorkflowSuggestionEngine {
  private generator: WorkflowGenerator;

  constructor() {
    this.generator = new WorkflowGenerator();
  }

  async suggestWorkflow(userActions: any[]): Promise<Workflow> {
    const pattern = await this.analyzePattern(userActions);
    const requirements = await this.generateRequirements(pattern);
    return this.generator.generateWorkflow(requirements);
  }

  private async analyzePattern(actions: any[]): Promise<string> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Analyze user actions to identify workflow patterns.',
      },
      {
        role: 'user',
        content: JSON.stringify(actions),
      },
    ]);

    return response?.choices[0]?.message?.content || '';
  }

  private async generateRequirements(pattern: string): Promise<string> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Generate workflow requirements based on the identified pattern.',
      },
      {
        role: 'user',
        content: pattern,
      },
    ]);

    return response?.choices[0]?.message?.content || '';
  }
}