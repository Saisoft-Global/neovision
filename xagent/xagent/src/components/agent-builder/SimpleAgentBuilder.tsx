import React, { useState } from 'react';
import { Brain, Sparkles, Database, Zap } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';
import { ModernInput } from '../ui/ModernInput';
import { AgentFactory } from '../../services/agent/AgentFactory';
import { useOrganizationStore } from '../../stores/organizationStore';
import type { AgentConfig } from '../../types/agent-framework';

/**
 * Simple Agent Builder - Lyzr.ai Style
 * Simplified interface for quick agent creation
 */
export const SimpleAgentBuilder: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    role: '',
    goal: '',
    instructions: '',
    llmProvider: 'openai' as 'openai' | 'ollama' | 'groq',
    llmModel: 'gpt-4-turbo-preview',
    memoryEnabled: true,
    knowledgeBaseEnabled: true,
    // Workforce capabilities
    workforceEnabled: false,
    workforceLevel: 'worker' as 'worker' | 'manager' | 'director',
    workforceDepartment: 'Customer Service',
    confidenceThreshold: 0.8,
    maxComplexity: 4,
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const llmProviders = [
    { value: 'openai', label: 'OpenAI', models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'] },
    { value: 'ollama', label: 'Ollama', models: ['llama2', 'mistral', 'codellama'] },
    { value: 'groq', label: 'Groq', models: ['mixtral-8x7b-32768', 'llama2-70b-4096'] },
  ];

  const currentProvider = llmProviders.find(p => p.value === formData.llmProvider);

  const handleImprovePrompt = async () => {
    // TODO: Use AI to improve the system prompt
    const improved = `You are a ${formData.role} with the following characteristics:

Role: ${formData.role}
Primary Goal: ${formData.goal}

Instructions:
${formData.instructions}

Always maintain a professional yet friendly tone, and ensure accuracy in your responses.`;
    
    setFormData(prev => ({
      ...prev,
      instructions: improved
    }));
  };

  const handleCreateAgent = async () => {
    setIsCreating(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.name || !formData.role || !formData.goal) {
        throw new Error('Please fill in all required fields');
      }

      // Build agent configuration
      const config: AgentConfig = {
        personality: {
          friendliness: 0.8,
          formality: 0.7,
          proactiveness: 0.7,
          detail_orientation: 0.8,
        },
        skills: [], // Core skills will be auto-added by AgentFactory
        knowledge_bases: formData.knowledgeBaseEnabled ? ['default'] : [],
        llm_config: {
          provider: formData.llmProvider,
          model: formData.llmModel,
          temperature: 0.7,
        },
        system_prompt: {
          role: formData.role,
          goal: formData.goal,
          instructions: formData.instructions,
        },
      };

      // Create agent using AgentFactory
      // Use 'tool_enabled' type for flexible, general-purpose agents
      const factory = AgentFactory.getInstance();
      
      // Create organization context if we have a current organization
      const orgContext = currentOrganization ? {
        organizationId: currentOrganization.id,
        userId: '', // Will be set by the factory
        visibility: 'organization' as const
      } : undefined;
      
      console.log('🏢 Creating agent with organization context:', {
        hasOrganization: !!currentOrganization,
        organizationId: currentOrganization?.id,
        organizationName: currentOrganization?.name,
        visibility: orgContext?.visibility
      });
      
      // Create agent with or without workforce capabilities
      const agent = formData.workforceEnabled 
        ? await factory.createWorkforceAgent({
            ...config,
            workforce: {
              level: formData.workforceLevel,
              department: formData.workforceDepartment,
              confidenceThreshold: formData.confidenceThreshold,
              maxComplexity: formData.maxComplexity,
              aiSupervisor: `ai-${formData.workforceDepartment.toLowerCase().replace(' ', '-')}-manager`
            }
          }, [], orgContext)
        : await factory.createToolEnabledAgent(config, [], orgContext);

      setSuccess(true);
      console.log('Agent created successfully:', agent);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          description: '',
          role: '',
          goal: '',
          instructions: '',
          llmProvider: 'openai',
          llmModel: 'gpt-4-turbo-preview',
          memoryEnabled: true,
          knowledgeBaseEnabled: true,
          workforceEnabled: false,
          workforceLevel: 'worker',
          workforceDepartment: 'Customer Service',
          confidenceThreshold: 0.8,
          maxComplexity: 4,
        });
        setSuccess(false);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Create New Agent</h1>
        <p className="text-white/60">
          Build an AI agent in minutes with our simple interface
        </p>
      </div>

      <ModernCard variant="glass" className="p-8">
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <ModernInput
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Customer Support Agent"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your agent's purpose"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">System Prompt</h2>
              <ModernButton
                onClick={handleImprovePrompt}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Improve
              </ModernButton>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Agent Role <span className="text-red-400">*</span>
              </label>
              <ModernInput
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g., You are an expert customer support agent"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Agent Goal <span className="text-red-400">*</span>
              </label>
              <ModernInput
                value={formData.goal}
                onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="e.g., Your goal is to address and resolve customer inquiries"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Agent Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="e.g., LISTEN to the customer's concern & GATHER all relevant information needed for resolution. PROVIDE clear and concise answers."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* LLM Configuration */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">LLM Configuration</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  LLM Provider
                </label>
                <select
                  value={formData.llmProvider}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    llmProvider: e.target.value as any,
                    llmModel: llmProviders.find(p => p.value === e.target.value)?.models[0] || ''
                  }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {llmProviders.map(provider => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  LLM Model
                </label>
                <select
                  value={formData.llmModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, llmModel: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {currentProvider?.models.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
            
            <div className="space-y-3">
              {/* Memory Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Memory</p>
                    <p className="text-sm text-white/60">Enable conversation memory for your agent</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.memoryEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, memoryEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Knowledge Base Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Knowledge Base (RAG)</p>
                    <p className="text-sm text-white/60">Connect your agent to a knowledge base</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.knowledgeBaseEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, knowledgeBaseEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Workforce Capabilities Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Workforce Capabilities</p>
                    <p className="text-sm text-white/60">Enable escalation and hierarchical workflows</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workforceEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, workforceEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Workforce Configuration (shown when enabled) */}
              {formData.workforceEnabled && (
                <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-lg font-medium text-white">Workforce Configuration</h3>
                  
                  {/* Workforce Level */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Workforce Level</label>
                    <select
                      value={formData.workforceLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, workforceLevel: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="worker">Worker - Handles routine tasks</option>
                      <option value="manager">Manager - Handles complex tasks</option>
                      <option value="director">Director - Handles strategic tasks</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Department</label>
                    <select
                      value={formData.workforceDepartment}
                      onChange={(e) => setFormData(prev => ({ ...prev, workforceDepartment: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="Customer Service">Customer Service</option>
                      <option value="Operations">Operations</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                    </select>
                  </div>

                  {/* Confidence Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Confidence Threshold: {formData.confidenceThreshold}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={formData.confidenceThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-white/60 mt-1">Escalate if confidence below this threshold</p>
                  </div>

                  {/* Max Complexity */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Max Complexity: {formData.maxComplexity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={formData.maxComplexity}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxComplexity: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-white/60 mt-1">Escalate if task complexity exceeds this level</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-sm">✅ Agent created successfully!</p>
            </div>
          )}

          {/* Create Button */}
          <ModernButton
            onClick={handleCreateAgent}
            variant="primary"
            disabled={isCreating || !formData.name || !formData.role || !formData.goal}
            className="w-full flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creating Agent...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Create Agent
              </>
            )}
          </ModernButton>

          {/* Advanced Options Link */}
          <div className="text-center pt-4">
            <a
              href="/agent-builder"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              Need more options? Try Advanced Builder →
            </a>
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

