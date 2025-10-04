import React from 'react';
import { Database, Cloud, MessageSquare, FileText, Globe, Building2 } from 'lucide-react';
import { NodeTemplate } from './NodeTemplate';

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const nodeTypes = [
    {
      type: 'database',
      label: 'Database',
      icon: Database,
      description: 'Database operations',
    },
    {
      type: 'cloud',
      label: 'Cloud Services',
      icon: Cloud,
      description: 'Cloud service integrations',
    },
    {
      type: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      description: 'Email, chat, and messaging',
    },
    {
      type: 'filesystem',
      label: 'File System',
      icon: FileText,
      description: 'File operations',
    },
    {
      type: 'http',
      label: 'HTTP Request',
      icon: Globe,
      description: 'API calls and web requests',
    },
    {
      type: 'enterprise',
      label: 'Enterprise',
      icon: Building2,
      description: 'Enterprise system integrations',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Node Types</h2>
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
          <NodeTemplate
            key={nodeType.type}
            type={nodeType.type}
            label={nodeType.label}
            icon={nodeType.icon}
            description={nodeType.description}
            onAdd={() => onAddNode(nodeType.type)}
          />
        ))}
      </div>
    </div>
  );
};