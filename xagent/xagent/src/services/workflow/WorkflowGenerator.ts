import { createChatCompletion } from '../openai/chat';
import type { Workflow, WorkflowNode } from '../../types/workflow';

export class WorkflowGenerator {
  async generateWorkflow(requirements: string): Promise<Workflow> {
    const response = await this.queryLLM(requirements);
    return this.parseWorkflow(response);
  }

  private async queryLLM(requirements: string) {
    return createChatCompletion([
      {
        role: 'system',
        content: 'Generate a workflow based on the given requirements. Include nodes, connections, and necessary parameters.',
      },
      {
        role: 'user',
        content: requirements,
      },
    ]);
  }

  private parseWorkflow(response: any): Workflow {
    const workflowData = JSON.parse(response?.choices[0]?.message?.content || '{}');
    
    return {
      id: crypto.randomUUID(),
      name: workflowData.name,
      description: workflowData.description,
      nodes: this.generateNodes(workflowData.steps),
      connections: this.generateConnections(workflowData.steps),
    };
  }

  private generateNodes(steps: any[]): WorkflowNode[] {
    return steps.map((step, index) => ({
      id: crypto.randomUUID(),
      label: step.name,
      description: step.description,
      position: { x: index * 200, y: 100 },
      action: step.action,
      parameters: step.parameters || {},
    }));
  }

  private generateConnections(steps: any[]) {
    const connections = [];
    for (let i = 0; i < steps.length - 1; i++) {
      connections.push({
        from: steps[i].id,
        to: steps[i + 1].id,
        startPoint: { x: i * 200 + 150, y: 100 },
        endPoint: { x: (i + 1) * 200, y: 100 },
        midPoint: { x: i * 200 + 100, y: 100 },
      });
    }
    return connections;
  }
}