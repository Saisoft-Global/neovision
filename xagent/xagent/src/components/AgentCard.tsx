import React from 'react';
import { Bot, Brain, CheckCircle, XCircle } from 'lucide-react';
import type { Agent } from '../types/agent';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onSelect(agent)}
    >
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-blue-100 rounded-full">
          <Bot className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{agent.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Brain className="w-4 h-4" />
            <span>{agent.expertise.join(', ')}</span>
          </div>
        </div>
        {agent.isAvailable ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
      <div className="mt-3 text-sm text-gray-500">
        <span className="capitalize">{agent.personality}</span> personality
      </div>
    </div>
  );
};