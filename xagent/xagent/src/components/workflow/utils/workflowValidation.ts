import type { Workflow } from '../../../types/workflow';

export function validateWorkflow(workflow: Workflow): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!workflow.nodes.length) {
    errors.push('Workflow must have at least one node');
  }

  // Check for valid connections
  workflow.connections.forEach(connection => {
    const sourceExists = workflow.nodes.some(n => n.id === connection.from);
    const targetExists = workflow.nodes.some(n => n.id === connection.to);

    if (!sourceExists) {
      errors.push(`Source node ${connection.from} not found`);
    }
    if (!targetExists) {
      errors.push(`Target node ${connection.to} not found`);
    }
  });

  // Check for cycles
  if (hasCycles(workflow)) {
    errors.push('Workflow contains cycles');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function hasCycles(workflow: Workflow): boolean {
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
    if (hasCycle(node.id)) return true;
  }

  return false;
}