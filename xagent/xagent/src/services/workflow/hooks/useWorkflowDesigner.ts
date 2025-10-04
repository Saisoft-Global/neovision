import { useState, useCallback } from 'react';
import type { Workflow, WorkflowNode, WorkflowConnection } from '../../../types/workflow';

export function useWorkflowDesigner(initialWorkflow?: Workflow) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(
    initialWorkflow?.connections || []
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const addNode = useCallback(() => {
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      label: 'New Step',
      description: 'Configure this workflow step',
      position: { x: 100, y: 100 },
      action: 'analyze',
      parameters: {},
    };
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const updateNode = useCallback((updatedNode: WorkflowNode) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === updatedNode.id ? updatedNode : node))
    );
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setConnections((prev) =>
      prev.filter((conn) => conn.from !== nodeId && conn.to !== nodeId)
    );
  }, []);

  const addConnection = useCallback((fromId: string, toId: string) => {
    const fromNode = nodes.find((n) => n.id === fromId);
    const toNode = nodes.find((n) => n.id === toId);
    
    if (!fromNode || !toNode) return;

    const newConnection: WorkflowConnection = {
      from: fromId,
      to: toId,
      startPoint: {
        x: fromNode.position.x + 150,
        y: fromNode.position.y + 30,
      },
      endPoint: {
        x: toNode.position.x,
        y: toNode.position.y + 30,
      },
      midPoint: {
        x: (fromNode.position.x + toNode.position.x) / 2,
        y: (fromNode.position.y + toNode.position.y) / 2,
      },
    };

    setConnections((prev) => [...prev, newConnection]);
  }, [nodes]);

  const removeConnection = useCallback((fromId: string, toId: string) => {
    setConnections((prev) =>
      prev.filter((conn) => !(conn.from === fromId && conn.to === toId))
    );
  }, []);

  return {
    nodes,
    connections,
    selectedNode,
    addNode,
    updateNode,
    removeNode,
    addConnection,
    removeConnection,
    setSelectedNode,
  };
}