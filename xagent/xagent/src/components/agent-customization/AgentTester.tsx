import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import type { AgentConfig } from '../../types/agent-framework';
import { AgentFactory } from '../../services/agent/AgentFactory';

interface AgentTesterProps {
  config: AgentConfig;
  onClose: () => void;
}

export const AgentTester: React.FC<AgentTesterProps> = ({ config, onClose }) => {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<Array<{ input: string; response: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTest = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const factory = AgentFactory.getInstance();
      const agent = await factory.createAgent('custom', config);
      const response = await agent.execute('process_input', { input });

      setResponses(prev => [...prev, { input, response: response as string }]);
      setInput('');
    } catch (error) {
      console.error('Test error:', error);
      setResponses(prev => [...prev, { 
        input, 
        response: 'Error: Failed to process input' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Test Agent</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="h-64 overflow-y-auto mb-4 space-y-4">
        {responses.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                {item.input}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                {item.response}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter test input..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleTest()}
        />
        <button
          onClick={handleTest}
          disabled={!input.trim() || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Test</span>
        </button>
      </div>
    </div>
  );
};