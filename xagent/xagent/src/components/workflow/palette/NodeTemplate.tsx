import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NodeTemplateProps {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
  onAdd: () => void;
}

export const NodeTemplate: React.FC<NodeTemplateProps> = ({
  type,
  label,
  icon: Icon,
  description,
  onAdd,
}) => {
  return (
    <button
      onClick={onAdd}
      className="w-full p-3 bg-white border rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 text-gray-500" />
        <div className="text-left">
          <h3 className="font-medium">{label}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </button>
  );
};