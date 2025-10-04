import React, { useState } from 'react';
import { Bot, Save } from 'lucide-react';
import { PersonalityEditor } from './PersonalityEditor';
import { SkillsEditor } from './SkillsEditor';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { useAgentBuilder } from '../../hooks/useAgentBuilder';
import type { AgentConfig } from '../../types/agent-framework';

export const AgentConfigForm: React.FC = () => {
  const { config, updateConfig, saveAgent, isValid, validationErrors } = useAgentBuilder();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!isValid) return;
    
    setIsSaving(true);
    try {
      await saveAgent();
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Configure Agent</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving...' : 'Save Agent'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => updateConfig({ name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Describe the agent's purpose"
              />
            </div>
          </div>

          {/* Personality Configuration */}
          <PersonalityEditor
            personality={config.personality}
            onChange={(personality) => updateConfig({ personality })}
          />

          {/* Skills Configuration */}
          <SkillsEditor
            skills={config.skills}
            onChange={(skills) => updateConfig({ skills })}
          />
        </div>

        <div className="space-y-6">
          {/* Knowledge Base Configuration */}
          <KnowledgeBaseSelector
            knowledgeBases={config.knowledge_bases}
            onChange={(knowledge_bases) => updateConfig({ knowledge_bases })}
          />

          {/* LLM Configuration */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Language Model Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
              <select
                value={config.llm_config?.provider || 'openai'}
                onChange={(e) => updateConfig({
                  llm_config: { ...config.llm_config, provider: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <select
                value={config.llm_config?.model || 'gpt-4-turbo-preview'}
                onChange={(e) => updateConfig({
                  llm_config: { ...config.llm_config, model: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="llama2">Llama 2</option>
                <option value="mistral">Mistral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature ({config.llm_config?.temperature || 0.7})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.llm_config?.temperature || 0.7}
                onChange={(e) => updateConfig({
                  llm_config: { ...config.llm_config, temperature: parseFloat(e.target.value) }
                })}
                className="mt-1 block w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Configuration Errors:</h3>
          <ul className="mt-2 list-disc list-inside text-red-600">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};