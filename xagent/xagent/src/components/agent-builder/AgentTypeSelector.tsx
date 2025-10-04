import React from 'react';
import { Bot, Mail, Calendar, FileText, Brain } from 'lucide-react';
import type { AgentType } from '../../types/agent';

interface AgentTypeSelectorProps {
  selectedType: AgentType;
  onSelect: (type: AgentType) => void;
}

const agentTypes = [
  { type: 'email', icon: Mail, label: 'Email Agent', description: 'Handles email communication and responses' },
  { type: 'meeting', icon: Calendar, label: 'Meeting Agent', description: 'Manages meetings and schedules' },
  { type: 'document', icon: FileText, label: 'Document Agent', description: 'Processes and analyzes documents' },
  { type: 'knowledge', icon: Brain, label: 'Knowledge Agent', description: 'Manages knowledge base and context' },
] as const;

export const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Agent Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agentTypes.map(({ type, icon: Icon, label, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selectedType === type
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <Icon className={`w-6 h-6 ${
                selectedType === type ? 'text-blue-500' : 'text-gray-500'
              }`} />
              <div>
                <h3 className="font-medium">{label}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};