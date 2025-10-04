import React from 'react';
import { ChatContainer } from '../chat/ChatContainer';
import { useAgentStore } from '../../store/agentStore';

export const ChatPage: React.FC = () => {
  const { selectedAgent } = useAgentStore();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chat</h1>
        {selectedAgent && (
          <p className="text-gray-600">
            Currently chatting with: {selectedAgent.name}
          </p>
        )}
      </div>
      <ChatContainer />
    </div>
  );
};