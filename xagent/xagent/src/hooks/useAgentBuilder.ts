import { useState } from 'react';
import { AgentFactory } from '../services/agent/AgentFactory';
import { useOrganizationStore } from '../stores/organizationStore';
import type { AgentConfig } from '../types/agent-framework';

// Core skills that are automatically added to every agent
const CORE_SKILLS = [
  { name: 'natural_language_understanding', level: 5 },
  { name: 'task_comprehension', level: 5 },
  { name: 'reasoning', level: 4 },
  { name: 'context_retention', level: 4 }
];

const defaultConfig: AgentConfig = {
  name: '',                             // User must provide name
  description: '',                      // User must provide description
  personality: {
    friendliness: 0.7,
    formality: 0.7,
    proactiveness: 0.7,
    detail_orientation: 0.7,
  },
  skills: [...CORE_SKILLS], // Start with core skills
  knowledge_bases: [],
  llm_config: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
  workflows: [], // Array of workflow IDs
  workforce: undefined, // Workforce capabilities (optional)
};

export function useAgentBuilder() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { currentOrganization } = useOrganizationStore();

  const validateConfig = (config: AgentConfig): string[] => {
    const errors: string[] = [];

    // Validate name
    if (!config.name || config.name.trim() === '' || config.name === 'New Agent') {
      errors.push('Agent name is required');
    }

    // Validate description
    if (!config.description || config.description.trim() === '' || config.description === 'AI Agent') {
      errors.push('Agent description is required');
    }

    // Personality is optional - we have defaults
    // if (!config.personality) {
    //   errors.push('Personality configuration is required');
    // }

    // Skills are now auto-added, but still validate
    if (!config.skills || config.skills.length === 0) {
      errors.push('At least one skill is required');
    }

    // LLM config is optional - we have defaults
    // if (!config.llm_config?.provider) {
    //   errors.push('LLM provider must be specified');
    // }

    // Agent type is the only required field
    if (!config.type) {
      errors.push('Agent type must be selected');
    }

    return errors;
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
  };

  const saveAgent = async (): Promise<{ id: string; name: string; type: string } | null> => {
    const errors = validateConfig(config);
    if (errors.length) {
      setValidationErrors(errors);
      alert(`Validation errors:\n${errors.join('\n')}`);
      return null;
    }

    try {
      console.log('💾 Saving agent with config:', {
        type: config.type,
        skillsCount: config.skills?.length || 0,
        hasPersonality: !!config.personality,
        hasLLM: !!config.llm_config
      });

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
      const agent = config.workforce 
        ? await factory.createWorkforceAgent(config, [], orgContext)
        : await factory.createToolEnabledAgent(config, [], orgContext);
      
      console.log(`✅ Agent created with ID: ${agent.id}`);
      
      const { getSupabaseClient } = await import('../config/supabase');
      const supabase = getSupabaseClient();
      
      // Link workflows to agent if any selected
      if (config.workflows && config.workflows.length > 0) {
        await supabase
          .from('agent_workflows')
          .insert(
            config.workflows.map(workflowId => ({
              agent_id: agent.id,
              workflow_id: workflowId,
            }))
          );
          
        console.log(`✅ Linked ${config.workflows.length} workflows to agent`);
      }
      
      // ✨ NEW: Attach tools to agent if any selected
      if (config.tools && config.tools.length > 0) {
        console.log(`🔧 Attaching ${config.tools.length} tools to agent...`);
        
        // Enable tools for organization first
        for (const toolId of config.tools) {
          try {
            // Check if already enabled
            const { data: existing } = await supabase
              .from('organization_tools')
              .select('*')
              .eq('organization_id', currentOrganization?.id)
              .eq('tool_id', toolId)
              .maybeSingle();
            
            if (!existing) {
              // Enable tool for organization
              await supabase
                .from('organization_tools')
                .insert({
                  organization_id: currentOrganization?.id,
                  tool_id: toolId,
                  enabled: true,
                  created_at: new Date().toISOString()
                });
              console.log(`   ✅ Enabled tool ${toolId} for organization`);
            }
            
            // Attach tool to agent in runtime (will persist via agent config)
            if ((agent as any).attachTool) {
              await (agent as any).attachTool(toolId);
              console.log(`   ✅ Attached tool ${toolId} to agent`);
            }
            
          } catch (toolError) {
            console.warn(`   ⚠️ Failed to attach tool ${toolId}:`, toolError);
            // Non-blocking, continue with other tools
          }
        }
        
        console.log(`✅ Tool attachment complete`);
      }
      
      // Handle success
      console.log('✅ Agent created successfully:', agent);
      
      // Clear form for next agent
      setConfig(defaultConfig);
      
      // Return agent info for navigation
      return {
        id: agent.id,
        name: config.name || 'New Agent',
        type: config.type || 'general'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent';
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      
      console.error('❌ Error creating agent:', error);
      console.error('Error details:', errorDetails);
      
      setValidationErrors([errorMessage]);
      alert(`❌ Failed to create agent:\n\n${errorMessage}\n\nCheck console for details.`);
      return null;
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