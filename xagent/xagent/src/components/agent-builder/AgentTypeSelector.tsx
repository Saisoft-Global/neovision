import React from 'react';
import { Bot, Mail, Calendar, FileText, Brain, Users, DollarSign, Headphones, Briefcase, Zap } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import type { AgentType } from '../../types/agent';

interface AgentTypeSelectorProps {
  selectedType?: AgentType;
  onSelect: (type: AgentType) => void;
}

const agentTypes = [
  { type: 'hr', icon: Users, label: 'HR Agent', description: 'Employee support, policies, onboarding, and HR queries' },
  { type: 'finance', icon: DollarSign, label: 'Finance Agent', description: 'Financial analysis, budgeting, and expense management' },
  { type: 'support', icon: Headphones, label: 'Support Agent', description: 'Customer support and issue resolution' },
  { type: 'knowledge', icon: Brain, label: 'Knowledge Agent', description: 'Knowledge base queries and information retrieval' },
  { type: 'email', icon: Mail, label: 'Email Agent', description: 'Email communication and response management' },
  { type: 'meeting', icon: Calendar, label: 'Meeting Agent', description: 'Meeting scheduling and coordination' },
  { type: 'task', icon: Briefcase, label: 'Task Agent', description: 'Task management and productivity tracking' },
  { type: 'productivity', icon: Zap, label: 'Productivity Agent', description: 'Workflow automation and productivity optimization' },
] as const;

export const AgentTypeSelector: React.FC<AgentTypeSelectorProps> = ({ selectedType, onSelect }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">Select Agent Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agentTypes.map(({ type, icon: Icon, label, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`p-4 rounded-xl text-left transition-all duration-200 ${
              selectedType === type
                ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/50'
                : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                selectedType === type 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                  : 'bg-white/10'
              }`}>
                <Icon className={`w-6 h-6 ${
                  selectedType === type ? 'text-white' : 'text-white/70'
                }`} />
              </div>
              <div>
                <h3 className="font-medium text-white">{label}</h3>
                <p className="text-sm text-white/60 mt-1">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};