import React from 'react';
import { X } from 'lucide-react';
import type { WorkflowNode } from '../../../types/workflow';
import { DatabaseConfigForm } from './forms/DatabaseConfigForm';
import { CloudConfigForm } from './forms/CloudConfigForm';
import { CommunicationConfigForm } from './forms/CommunicationConfigForm';
import { FileSystemConfigForm } from './forms/FileSystemConfigForm';
import { HttpConfigForm } from './forms/HttpConfigForm';
import { EnterpriseConfigForm } from './forms/EnterpriseConfigForm';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdate,
  onClose,
}) => {
  const renderConfigForm = () => {
    switch (node.type) {
      case 'database':
        return <DatabaseConfigForm node={node} onUpdate={onUpdate} />;
      case 'cloud':
        return <CloudConfigForm node={node} onUpdate={onUpdate} />;
      case 'communication':
        return <CommunicationConfigForm node={node} onUpdate={onUpdate} />;
      case 'filesystem':
        return <FileSystemConfigForm node={node} onUpdate={onUpdate} />;
      case 'http':
        return <HttpConfigForm node={node} onUpdate={onUpdate} />;
      case 'enterprise':
        return <EnterpriseConfigForm node={node} onUpdate={onUpdate} />;
      default:
        return <div>No configuration available for this node type</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Node Configuration</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {renderConfigForm()}
    </div>
  );
};