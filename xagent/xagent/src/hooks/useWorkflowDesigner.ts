import { useState, useCallback } from 'react';
import type { Workflow, WorkflowNode, WorkflowConnection } from '../types/workflow';

export function useWorkflowDesigner(initialWorkflow?: Workflow) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(initialWorkflow?.connections || []);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const addNode = useCallback((type: string) => {
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      label: `New ${type} Node`,
      description: `Configure this ${type} node`,
      position: { x: 100, y: 100 },
      action: 'process',
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
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return; // Prevent self-connections
    
    // Check if connection already exists
    const exists = connections.some(
      conn => conn.from === fromId && conn.to === toId
    );
    if (exists) return;

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
  }, [nodes, connections]);

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