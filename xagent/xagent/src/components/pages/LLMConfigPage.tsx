import React from 'react';
import { LLMConfig } from '../llm/LLMConfig';
import { Brain } from 'lucide-react';

export const LLMConfigPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">LLM Configuration</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        🤖 Configure your Language Learning Model settings
      </p>
      <LLMConfig />
    </div>
  );
};
