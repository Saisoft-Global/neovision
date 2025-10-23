import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { OrchestratorAgent } from '../../services/orchestrator/OrchestratorAgent';
import type { Message } from '../../types/agent';
import { format } from 'date-fns';

interface UniversalChatContainerProps {
  className?: string;
}

export const UniversalChatContainer: React.FC<UniversalChatContainerProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orchestrator = OrchestratorAgent.getInstance();
  const { user } = useAuthStore();

  useEffect(() => {
    // Initialize orchestrator (it's a singleton, so just check if it exists)
    const init = async () => {
      try {
        // OrchestratorAgent is already initialized when getInstance() is called
        // No need for separate initialize() call
        console.log('✅ OrchestratorAgent ready');
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize orchestrator:', error);
        setIsInitializing(false);
      }
    };
    init();
  }, [orchestrator]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || isInitializing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      senderId: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Use orchestrator to automatically route to appropriate agent(s)
      const response = await orchestrator.processRequest(input);
      
      if (response.success) {
        // Determine which agent(s) responded
        const agentName = response.agentId || 'AI Assistant';
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          content: response.data as string,
          senderId: agentName,
          timestamp: new Date(),
          type: 'text',
        }]);
      } else {
        throw new Error(response.error || 'Failed to process request');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        senderId: 'system',
        timestamp: new Date(),
        type: 'error',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (isInitializing) {
    return (
      <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Initializing Universal AI Assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Universal AI Assistant</h2>
            <p className="text-sm text-gray-600">Intelligent routing to the right agent</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">Available</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Universal AI Assistant</h3>
            <p className="text-gray-600 max-w-md">
              I can help you with anything! Just type your request and I'll automatically route it to the right specialist agent.
            </p>
            <div className="mt-6 space-y-2 text-sm text-gray-500">
              <p><strong>Examples:</strong></p>
              <p>• "Go to Google and search for AI" → Desktop Automation</p>
              <p>• "Create a budget report" → Finance Agent</p>
              <p>• "Help with employee onboarding" → HR Agent</p>
              <p>• "Send email to John" → Email Agent</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {format(message.timestamp, 'HH:mm:ss')}
                  {message.senderId !== 'user' && message.senderId !== 'system' && (
                    <span className="ml-2 text-blue-600">• {message.senderId}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type anything... I'll route it to the right agent!"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing || isInitializing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || isInitializing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default UniversalChatContainer;
