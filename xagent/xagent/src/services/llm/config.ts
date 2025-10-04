import type { LLMConfig } from './types';
import { isServiceConfigured } from '../../config/environment';

// Get available providers
const getAvailableProviders = () => {
  const providers = [];
  if (isServiceConfigured('openai')) providers.push('openai');
  if (isServiceConfigured('ollama')) providers.push('ollama');
  return providers;
};

// Default to first available provider or 'openai'
const defaultProvider = getAvailableProviders()[0] || 'openai';

export const defaultConfig: LLMConfig = {
  provider: defaultProvider,
  model: defaultProvider === 'openai' ? 'gpt-4-turbo-preview' : 'llama2',
  temperature: 0.7,
  maxTokens: 2000,
};

export const modelConfigs: Record<string, Partial<LLMConfig>> = {
  // OpenAI Models
  'gpt-4': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
  'gpt-3.5': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  // Ollama Models
  'llama2': {
    provider: 'ollama',
    model: 'llama2',
    temperature: 0.7,
  },
  'mistral': {
    provider: 'ollama',
    model: 'mistral',
    temperature: 0.7,
  },
  'codellama': {
    provider: 'ollama',
    model: 'codellama',
    temperature: 0.7,
  },
};