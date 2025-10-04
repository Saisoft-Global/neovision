import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { LLMProviderManager } from '../../services/llm/providers/LLMProviderManager';
import type { LLMProvider } from '../../services/llm/types';

export const LLMProviderStatus: React.FC = () => {
  const manager = LLMProviderManager.getInstance();
  const availableProviders = manager.getAvailableProviders();

  const providers: Record<LLMProvider, string> = {
    openai: 'OpenAI',
    ollama: 'Ollama',
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">LLM Provider Status</h3>
      <div className="space-y-3">
        {Object.entries(providers).map(([id, name]) => (
          <div key={id} className="flex items-center justify-between">
            <span>{name}</span>
            {availableProviders.includes(id as LLMProvider) ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Available</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Not Configured</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}