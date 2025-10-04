import React, { useState } from 'react';
import { X, GripVertical, Settings } from 'lucide-react';
import type { WorkflowNode as WorkflowNodeType } from '../../../types/workflow';
import { NodeConfigDialog } from './NodeConfigDialog';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  onUpdate: (node: WorkflowNodeType) => void;
  onRemove: () => void;
  onConnect: (targetId: string) => void;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  onUpdate,
  onRemove,
  onConnect,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('nodeId', node.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('nodeId');
    if (sourceId !== node.id) {
      onConnect(node.id);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
        }}
        className={`w-64 bg-white rounded-lg shadow-md ${
          isDragging ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center space-x-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
            <h3 className="font-medium">{node.label}</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowConfig(true)}
              className="p-1 text-gray-400 hover:text-blue-500"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-3">
          <p className="text-sm text-gray-600">{node.description}</p>
        </div>
      </div>

      {showConfig && (
        <NodeConfigDialog
          node={node}
          onClose={() => setShowConfig(false)}
          onSave={(updates) => {
            onUpdate({ ...node, ...updates });
            setShowConfig(false);
          }}
        />
      )}
    </>
  );
};