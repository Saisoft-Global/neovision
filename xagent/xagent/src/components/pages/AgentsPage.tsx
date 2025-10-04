import React from 'react';
import { AgentGrid } from '../agents/AgentGrid';
import { ChatContainer } from '../chat';

export const AgentsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Agents</h1>
        <p className="text-gray-600 mt-2">
          Interact with specialized AI agents trained for specific domains
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <AgentGrid />
        </div>
        
        <div className="lg:border-l lg:pl-8">
          <ChatContainer />
        </div>
      </div>
    </div>
  );
};