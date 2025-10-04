import React from 'react';
import { Bot } from 'lucide-react';
import type { Agent } from '../../types/agent';

interface ChatHeaderProps {
  agent: Agent;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ agent }) => (
  <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
    <div className="flex items-center space-x-3">
      <Bot className="w-6 h-6 text-blue-600" />
      <div>
        <h2 className="font-semibold">{agent.name}</h2>
        <p className="text-sm text-gray-500">
          {agent.expertise.join(' • ')}
        </p>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <span 
        className={`w-2 h-2 rounded-full ${
          agent.isAvailable ? 'bg-green-500' : 'bg-red-500'
        }`} 
      />
      <span className="text-sm text-gray-500">
        {agent.isAvailable ? 'Available' : 'Busy'}
      </span>
    </div>
  </div>
);