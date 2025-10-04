import React from 'react';
import { Bot, Brain } from 'lucide-react';
import type { Agent } from '../../types/agent';
import AgentIcon from './AgentIcon';
import AgentStatus from './AgentStatus';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  isSelected?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, isSelected }) => (
  <div 
    onClick={() => onSelect(agent)}
    className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer border-2 ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent'
    }`}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onSelect(agent)}
  >
    <div className="flex items-start space-x-4">
      <AgentIcon type={agent.type} size={32} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
          </div>
          <AgentStatus isAvailable={agent.isAvailable} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-blue-500" />
            <div className="flex flex-wrap gap-2">
              {agent.expertise.map((skill) => (
                <span 
                  key={skill}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {agent.personality && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(agent.personality).map(([trait, value]) => (
                <div key={trait} className="text-xs text-gray-600">
                  <span className="capitalize">{trait.replace('_', ' ')}: </span>
                  <span className="font-medium">{Math.round(value * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);