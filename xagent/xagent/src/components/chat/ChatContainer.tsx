import React, { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { ChatInput } from './ChatInput';
import { useAgentStore } from '../../store/agentStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from './EmptyState';
import { ChatProcessor } from '../../services/chat/ChatProcessor';
import { Alert } from '../common/Alert';

export const ChatContainer: React.FC = () => {
  const { selectedAgent, messages, isLoading, addMessage } = useAgentStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatProcessor = ChatProcessor.getInstance();

  if (!selectedAgent) {
    return <EmptyState />;
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || processing) return;

    const userMessage = {
      id: crypto.randomUUID(),
      content,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    addMessage(userMessage);
    setProcessing(true);
    setError(null);

    try {
      // Process message and get response
      const response = await chatProcessor.processMessage(content, selectedAgent);

      // Add agent response
      addMessage({
        id: crypto.randomUUID(),
        content: response,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text',
      });
    } catch (err) {
      console.error('Failed to process message:', err);
      setError(err instanceof Error ? err.message : 'Failed to process message');
      
      // Add error message
      addMessage({
        id: crypto.randomUUID(),
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-lg shadow-lg">
      <ChatHeader agent={selectedAgent} />
      
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading conversation..." />
        ) : (
          <MessageThread messages={messages} />
        )}
      </div>

      {error && (
        <div className="px-4 py-2">
          <Alert type="error" message={error} />
        </div>
      )}

      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={!selectedAgent.isAvailable || processing}
        loading={processing}
      />
    </div>
  );
};