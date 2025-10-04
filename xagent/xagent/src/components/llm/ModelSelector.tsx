import React from 'react';
import { Settings } from 'lucide-react';
import { useLLMConfigStore } from '../../store/llmConfigStore';
import { modelConfigs } from '../../services/llm/config';

export const ModelSelector: React.FC = () => {
  const { config, setModel } = useLLMConfigStore();

  return (
    <div className="flex items-center space-x-2 p-4 bg-white rounded-lg shadow-sm">
      <Settings className="w-5 h-5 text-gray-500" />
      <select
        value={config.model}
        onChange={(e) => setModel(e.target.value)}
        className="form-select rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
      >
        {Object.entries(modelConfigs).map(([id, config]) => (
          <option key={id} value={config.model}>
            {config.model} ({config.provider})
          </option>
        ))}
      </select>
    </div>
  );
};