import React, { useEffect, useRef, useState } from 'react';
import { WorkflowNode } from '../nodes/WorkflowNode';
import { WorkflowConnection } from '../connections/WorkflowConnection';
import type { WorkflowNode as WorkflowNodeType, WorkflowConnection as ConnectionType } from '../../../types/workflow';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeType[];
  connections: ConnectionType[];
  onNodeSelect: (node: WorkflowNodeType) => void;
  onNodeRemove: (nodeId: string) => void;
  onNodePositionChange: (nodeId: string, x: number, y: number) => void;
  onConnectionCreate: (fromId: string, toId: string) => void;
  onConnectionRemove: (fromId: string, toId: string) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  connections,
  onNodeSelect,
  onNodeRemove,
  onNodePositionChange,
  onConnectionCreate,
  onConnectionRemove,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const handleNodeConnection = (e: CustomEvent<{ sourceId: string; targetId: string }>) => {
      onConnectionCreate(e.detail.sourceId, e.detail.targetId);
    };

    window.addEventListener('node-connected' as any, handleNodeConnection as any);
    return () => {
      window.removeEventListener('node-connected' as any, handleNodeConnection as any);
    };
  }, [onConnectionCreate]);

  const handleNodeSelect = (node: WorkflowNodeType) => {
    setSelectedNodeId(node.id);
    onNodeSelect(node);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData('nodeId');
    const targetId = e.dataTransfer.getData('targetId');
    
    if (nodeId && targetId && nodeId !== targetId) {
      onConnectionCreate(nodeId, targetId);
    }
  };

  return (
    <div 
      ref={canvasRef}
      className="workflow-canvas bg-gray-50 border rounded-lg h-[600px] relative overflow-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0">
        {connections.map((connection) => (
          <WorkflowConnection
            key={`${connection.from}-${connection.to}`}
            connection={connection}
            onRemove={() => onConnectionRemove(connection.from, connection.to)}
          />
        ))}
        
        {nodes.map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            onSelect={() => handleNodeSelect(node)}
            onRemove={() => onNodeRemove(node.id)}
            onPositionChange={onNodePositionChange}
          />
        ))}
      </div>
    </div>
  );
};