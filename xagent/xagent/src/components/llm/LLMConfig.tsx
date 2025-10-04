import React from 'react';
import { ModelSelector } from './ModelSelector';
import { ProviderSelector } from './ProviderSelector';
import { TemperatureControl } from './TemperatureControl';
import { LLMProviderStatus } from './LLMProviderStatus';

export const LLMConfig: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Model Configuration</h2>
      
      <LLMProviderStatus />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProviderSelector />
        <ModelSelector />
        <TemperatureControl />
      </div>
    </div>
  );
};