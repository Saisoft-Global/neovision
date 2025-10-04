import type { Workflow } from '../../types/workflow';

export class WorkflowValidator {
  validateWorkflow(workflow: Workflow): void {
    this.validateNodes(workflow);
    this.validateConnections(workflow);
    this.validateCycles(workflow);
  }

  private validateNodes(workflow: Workflow): void {
    if (!workflow.nodes.length) {
      throw new Error('Workflow must have at least one node');
    }

    for (const node of workflow.nodes) {
      if (!node.action) {
        throw new Error(`Node ${node.id} must have an action`);
      }
    }
  }

  private validateConnections(workflow: Workflow): void {
    for (const connection of workflow.connections) {
      const sourceExists = workflow.nodes.some(n => n.id === connection.from);
      const targetExists = workflow.nodes.some(n => n.id === connection.to);

      if (!sourceExists || !targetExists) {
        throw new Error(`Invalid connection: ${connection.from} -> ${connection.to}`);
      }
    }
  }

  private validateCycles(workflow: Workflow): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter(c => c.from === nodeId);
      for (const connection of outgoingConnections) {
        if (hasCycle(connection.to)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (hasCycle(node.id)) {
        throw new Error('Workflow contains cycles');
      }
    }
  }
}