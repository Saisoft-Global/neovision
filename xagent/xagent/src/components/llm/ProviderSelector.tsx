import React from 'react';
import { Network } from 'lucide-react';
import { useLLMConfigStore } from '../../store/llmConfigStore';
import type { LLMProvider } from '../../services/llm/types';

export const ProviderSelector: React.FC = () => {
  const { config, setProvider } = useLLMConfigStore();

  const providers: { value: LLMProvider; label: string }[] = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'groq', label: 'Groq' },
    { value: 'ollama', label: 'Ollama' },
  ];

  return (
    <div className="flex items-center space-x-2 p-4 bg-white rounded-lg shadow-sm">
      <Network className="w-5 h-5 text-gray-500" />
      <select
        value={config.provider}
        onChange={(e) => setProvider(e.target.value as LLMProvider)}
        className="form-select rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
      >
        {providers.map((provider) => (
          <option key={provider.value} value={provider.value}>
            {provider.label}
          </option>
        ))}
      </select>
    </div>
  );
};