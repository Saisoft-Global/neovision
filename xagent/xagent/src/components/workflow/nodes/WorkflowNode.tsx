import React, { useState } from 'react';
import { GripVertical, Settings, X } from 'lucide-react';
import type { WorkflowNode as WorkflowNodeType } from '../../../types/workflow';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onRemove,
  onPositionChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.dataTransfer.setData('nodeId', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    const canvas = e.currentTarget.closest('.workflow-canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      onPositionChange(node.id, x, y);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`w-64 bg-white rounded-lg shadow-md cursor-move ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium">{node.label}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onSelect}
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

      {/* Connection points */}
      <div className="absolute left-0 top-1/2 w-3 h-3 -ml-1.5 bg-blue-500 rounded-full transform -translate-y-1/2" />
      <div className="absolute right-0 top-1/2 w-3 h-3 -mr-1.5 bg-blue-500 rounded-full transform -translate-y-1/2" />
    </div>
  );
};