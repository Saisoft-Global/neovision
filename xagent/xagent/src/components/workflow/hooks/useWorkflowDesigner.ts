import { useState } from 'react';
import type { Workflow, WorkflowNode, WorkflowConnection } from '../../../types/workflow';

export function useWorkflowDesigner() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const addNode = () => {
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      label: 'New Step',
      description: 'Configure this workflow step',
      position: { x: 100, y: 100 },
      action: 'process',
      parameters: {},
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (updatedNode: WorkflowNode) => {
    setNodes(nodes.map(node => 
      node.id === updatedNode.id ? updatedNode : node
    ));
    setSelectedNode(null);
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn => 
      conn.from !== nodeId && conn.to !== nodeId
    ));
  };

  const addConnection = (fromId: string, toId: string) => {
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    
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

    setConnections([...connections, newConnection]);
  };

  const removeConnection = (fromId: string, toId: string) => {
    setConnections(connections.filter(conn => 
      !(conn.from === fromId && conn.to === toId)
    ));
  };

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