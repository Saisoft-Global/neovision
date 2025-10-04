import React, { useRef, useState } from 'react';
import { NodeList } from './NodeList';
import { ConnectionLines } from './ConnectionLines';
import { useWorkflowStore } from '../../../store/workflowStore';
import { NodePalette } from '../palette/NodePalette';
import { WorkflowToolbar } from './WorkflowToolbar';

export const WorkflowCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { selectedWorkflow, addNode, updateNodePosition } = useWorkflowStore();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    if (!nodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    addNode(selectedWorkflow!.id, {
      type: nodeType,
      position,
      label: `New ${nodeType} Node`,
      description: `Configure this ${nodeType} node`,
      action: 'process',
      parameters: {}
    });
  };

  return (
    <div className="flex h-full">
      <NodePalette />
      
      <div className="flex-1 flex flex-col">
        <WorkflowToolbar />
        
        <div 
          ref={canvasRef}
          className="flex-1 relative bg-gray-50 border rounded-lg overflow-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <ConnectionLines />
          <NodeList />
        </div>
      </div>
    </div>
  );
};