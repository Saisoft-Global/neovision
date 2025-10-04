import { create } from 'zustand';
import type { LLMConfig } from '../services/llm/types';
import { defaultConfig } from '../services/llm/config';

interface LLMConfigState {
  config: LLMConfig;
  setConfig: (config: Partial<LLMConfig>) => void;
  setProvider: (provider: LLMConfig['provider']) => void;
  setModel: (model: string) => void;
}

export const useLLMConfigStore = create<LLMConfigState>((set) => ({
  config: defaultConfig,
  setConfig: (newConfig) =>
    set((state) => ({ config: { ...state.config, ...newConfig } })),
  setProvider: (provider) =>
    set((state) => ({ config: { ...state.config, provider } })),
  setModel: (model) =>
    set((state) => ({ config: { ...state.config, model } })),
}));