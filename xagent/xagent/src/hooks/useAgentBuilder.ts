import { useState } from 'react';
import { AgentFactory } from '../services/agent/AgentFactory';
import type { AgentConfig } from '../types/agent-framework';

const defaultConfig: AgentConfig = {
  personality: {
    friendliness: 0.7,
    formality: 0.7,
    proactiveness: 0.7,
    detail_orientation: 0.7,
  },
  skills: [],
  knowledge_bases: [],
  llm_config: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
};

export function useAgentBuilder() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateConfig = (config: AgentConfig): string[] => {
    const errors: string[] = [];

    if (!config.personality) {
      errors.push('Personality configuration is required');
    }

    if (!config.skills.length) {
      errors.push('At least one skill is required');
    }

    if (!config.llm_config.provider) {
      errors.push('LLM provider must be specified');
    }

    return errors;
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
  };

  const saveAgent = async () => {
    const errors = validateConfig(config);
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    try {
      const factory = AgentFactory.getInstance();
      await factory.createAgent('custom', config);
      // Handle success (e.g., show notification, redirect)
    } catch (error) {
      setValidationErrors([error.message]);
    }
  };

  return {
    config,
    updateConfig,
    saveAgent,
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}