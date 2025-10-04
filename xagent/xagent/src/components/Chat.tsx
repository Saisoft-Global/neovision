import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader } from 'lucide-react';
import { useAgentStore } from '../store/agentStore';
import { useAuthStore } from '../store/authStore';
import { OrchestratorAgent } from '../services/orchestrator/OrchestratorAgent';
import AgentGrid from './agents/AgentGrid';
import type { Message, Agent } from '../types/agent';
import { format } from 'date-fns';

export const ChatContainer: React.FC = () => {
  const { selectedAgent, messages, isLoading, addMessage } = useAgentStore();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orchestrator = OrchestratorAgent.getInstance();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    addMessage(userMessage);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await orchestrator.processRequest(input);
      
      addMessage({
        id: crypto.randomUUID(),
        content: response.data as string,
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'text',
      });
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        content: error instanceof Error ? error.message : 'Failed to process message',
        senderId: selectedAgent.id,
        timestamp: new Date(),
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] bg-white rounded-lg shadow-md">
        <Bot className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Agent Selected</h3>
        <p className="mt-2 text-sm text-gray-500">
          Select an agent from the list to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="font-semibold">{selectedAgent.name}</h2>
            <p className="text-sm text-gray-500">
              {selectedAgent.expertise.join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span 
            className={`w-2 h-2 rounded-full ${
              selectedAgent.isAvailable ? 'bg-green-500' : 'bg-red-500'
            }`} 
          />
          <span className="text-sm text-gray-500">
            {selectedAgent.isAvailable ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.senderId === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <span
                className={`text-xs mt-1 block ${
                  message.senderId === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {format(message.timestamp, 'HH:mm')}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedAgent.isAvailable || isProcessing}
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder={
              !selectedAgent.isAvailable
                ? 'Agent is unavailable'
                : 'Type your message...'
            }
          />
          <button
            type="submit"
            disabled={!input.trim() || !selectedAgent.isAvailable || isProcessing}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isProcessing ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatContainer;