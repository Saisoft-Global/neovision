import React from 'react';
import { Thermometer } from 'lucide-react';
import { useLLMConfigStore } from '../../store/llmConfigStore';

export const TemperatureControl: React.FC = () => {
  const { config, setConfig } = useLLMConfigStore();

  return (
    <div className="flex items-center space-x-2 p-4 bg-white rounded-lg shadow-sm">
      <Thermometer className="w-5 h-5 text-gray-500" />
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">
          Temperature: {config.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature}
          onChange={(e) => setConfig({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};