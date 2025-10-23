import React from 'react';
import { AgentGrid } from '../agents/AgentGrid';
import { ChatContainer } from '../chat';
import { Users } from 'lucide-react';

export const AgentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
          <Users className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">AI Agents</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        🤖 Interact with specialized AI agents trained for specific domains
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AgentGrid />
        </div>
        
        <div className="lg:border-l lg:border-white/10 lg:pl-6">
          <ChatContainer />
        </div>
      </div>
    </div>
  );
};