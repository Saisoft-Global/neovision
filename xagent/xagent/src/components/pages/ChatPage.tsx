import React from 'react';
import { ChatContainer } from '../chat/ChatContainer';
import { useAgentStore } from '../../store/agentStore';
import { StatusBadge } from '../ui/StatusBadge';

export const ChatPage: React.FC = () => {
  const { selectedAgent } = useAgentStore();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Chat</h1>
          {selectedAgent && (
            <StatusBadge 
              status={selectedAgent.isAvailable ? 'online' : 'offline'} 
              label={selectedAgent.name}
              pulse
            />
          )}
        </div>
        {selectedAgent && (
          <p className="text-white/60 text-sm md:text-base">
            💬 Chatting with: <span className="font-semibold text-white">{selectedAgent.name}</span>
          </p>
        )}
      </div>
      <ChatContainer />
    </div>
  );
};