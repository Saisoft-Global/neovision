import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { WorkflowNode } from '../../../types/workflow';
import { NodeConfigForm } from '../forms/NodeConfigForm';

interface NodeConfigModalProps {
  node: WorkflowNode;
  onClose: () => void;
  onSave: (node: WorkflowNode) => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  node,
  onClose,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Configure Workflow Step</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <NodeConfigForm node={node} onSave={onSave} onCancel={onClose} />
      </div>
    </div>
  );
};