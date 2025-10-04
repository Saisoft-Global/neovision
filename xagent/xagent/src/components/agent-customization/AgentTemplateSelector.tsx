import React from 'react';
import { Bot, Brain, Users, Calculator } from 'lucide-react';
import { AGENT_TEMPLATES, type AgentTemplate } from '../../services/agent/templates/AgentTemplate';

interface AgentTemplateSelectorProps {
  selectedTemplate: AgentTemplate | null;
  onSelect: (template: AgentTemplate) => void;
}

export const AgentTemplateSelector: React.FC<AgentTemplateSelectorProps> = ({
  selectedTemplate,
  onSelect,
}) => {
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'hr':
        return Users;
      case 'finance':
        return Calculator;
      case 'support':
        return Brain;
      default:
        return Bot;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Template</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(AGENT_TEMPLATES).map(([id, template]) => {
          const Icon = getTemplateIcon(template.type);
          return (
            <button
              key={id}
              onClick={() => onSelect(template)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedTemplate?.type === template.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Icon className={`w-6 h-6 ${
                  selectedTemplate?.type === template.type
                    ? 'text-blue-500'
                    : 'text-gray-500'
                }`} />
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};