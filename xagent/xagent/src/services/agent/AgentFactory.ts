import { getSupabaseClient } from '../../config/supabase';
import type { AgentConfig, AgentSkill } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { EmailAgent } from './agents/EmailAgent';
import { MeetingAgent } from './agents/MeetingAgent';
import { KnowledgeAgent } from './agents/KnowledgeAgent';
import { TaskAgent } from './agents/TaskAgent';
import { DirectExecutionAgent } from './agents/DirectExecutionAgent';
import { ProductivityAIAgent } from './agents/ProductivityAIAgent';
import { ToolEnabledAgent } from './ToolEnabledAgent';
import { toolRegistry } from '../tools/ToolRegistry';

/**
 * Core skills that EVERY agent must have to function
 * These provide natural language understanding and basic intelligence
 */
const CORE_AGENT_SKILLS: AgentSkill[] = [
  {
    name: 'natural_language_understanding',
    level: 5,
    config: {
      description: 'Ability to understand and process natural language inputs from users',
      capabilities: ['intent_recognition', 'context_awareness', 'semantic_understanding']
    }
  },
  {
    name: 'natural_language_generation',
    level: 5,
    config: {
      description: 'Ability to generate human-like responses in natural language',
      capabilities: ['contextual_response', 'tone_adjustment', 'clarity_optimization']
    }
  },
  {
    name: 'task_comprehension',
    level: 5,
    config: {
      description: 'Ability to understand and decompose complex tasks',
      capabilities: ['goal_extraction', 'step_planning', 'dependency_analysis']
    }
  },
  {
    name: 'reasoning',
    level: 4,
    config: {
      description: 'Logical reasoning and problem-solving capabilities',
      capabilities: ['deductive_reasoning', 'inductive_reasoning', 'causal_analysis']
    }
  },
  {
    name: 'context_retention',
    level: 4,
    config: {
      description: 'Ability to maintain and use conversation context',
      capabilities: ['memory_recall', 'context_continuity', 'reference_resolution']
    }
  }
];

export interface OrganizationContext {
  organizationId: string | null;
  userId: string;
  visibility?: 'private' | 'organization' | 'team' | 'public';
}

export class AgentFactory {
  private static instance: AgentFactory;
  private supabase;
  private agentCache: Map<string, BaseAgent>;
  private currentOrgContext: OrganizationContext | null = null;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.agentCache = new Map();
  }

  public static getInstance(): AgentFactory {
    if (!this.instance) {
      this.instance = new AgentFactory();
    }
    return this.instance;
  }

  /**
   * Set organization context for all subsequent operations
   */
  public setOrganizationContext(context: OrganizationContext): void {
    this.currentOrgContext = context;
    console.log(`🏢 Agent factory organization context set:`, {
      org: context.organizationId,
      user: context.userId
    });
  }

  /**
   * Clear organization context
   */
  public clearOrganizationContext(): void {
    this.currentOrgContext = null;
    console.log(`🔄 Agent factory organization context cleared`);
  }

  /**
   * Get current organization context
   */
  public getOrganizationContext(): OrganizationContext | null {
    return this.currentOrgContext;
  }

  /**
   * ✨ NEW: Get agent instance by ID (with caching for performance)
   * This allows OrchestratorAgent to use agent's RAG-powered methods
   */
  async getAgentInstance(agentId: string): Promise<BaseAgent> {
    // Check cache first
    if (this.agentCache.has(agentId)) {
      console.log(`📦 Using cached agent instance: ${agentId}`);
      return this.agentCache.get(agentId)!;
    }

    try {
      console.log(`🔍 Loading agent instance: ${agentId}`);
      
      // Load agent config from database
      const { data: agentData, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agentData) {
        console.error(`Agent ${agentId} not found:`, error);
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Create agent config
      const config: AgentConfig = {
        name: agentData.name,
        type: agentData.type || 'general',
        description: agentData.description || '',
        personality: agentData.personality || {
          friendliness: 0.7,
          formality: 0.5,
          proactiveness: 0.6,
          detail_orientation: 0.7
        },
        skills: agentData.skills || [],
        knowledgeBase: {
          sources: [],
          updateFrequency: 'on_demand'
        },
        llm_config: {
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          max_tokens: 2000
        }
      };

      // Enrich with core skills
      const enrichedConfig = this.enrichConfigWithCoreSkills(config);

      // Create appropriate agent type
      let agent: BaseAgent;

      switch (config.type) {
        case 'email':
          agent = new EmailAgent(agentId, enrichedConfig);
          break;
        case 'meeting':
          agent = new MeetingAgent(agentId, enrichedConfig);
          break;
        case 'knowledge':
          agent = new KnowledgeAgent(agentId, enrichedConfig);
          break;
        case 'task':
          agent = new TaskAgent(agentId, enrichedConfig);
          break;
        case 'productivity':
          agent = new ProductivityAIAgent(agentId, enrichedConfig);
          break;
        case 'tool_enabled':
          agent = new ToolEnabledAgent(agentId, enrichedConfig, []);
          break;
        default:
          // Default to DirectExecutionAgent for custom agents
          agent = new DirectExecutionAgent(agentId, enrichedConfig);
      }

      // Cache the agent instance
      this.agentCache.set(agentId, agent);
      
      console.log(`✅ Agent instance created and cached: ${agentId} (${config.type})`);
      return agent;

    } catch (error) {
      console.error(`Error loading agent instance ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Clear agent cache (useful for updates)
   */
  clearCache(agentId?: string): void {
    if (agentId) {
      this.agentCache.delete(agentId);
      console.log(`🗑️ Cleared cache for agent: ${agentId}`);
    } else {
      this.agentCache.clear();
      console.log(`🗑️ Cleared all agent cache`);
    }
  }

  /**
   * Merges core skills with agent-specific skills
   * Core skills are always added at the beginning and cannot be overridden
   */
  private enrichConfigWithCoreSkills(config: AgentConfig): AgentConfig {
    // Check if agent already has any core skills (to avoid duplicates)
    const coreSkillNames = CORE_AGENT_SKILLS.map(s => s.name);
    const agentSpecificSkills = config.skills.filter(
      skill => !coreSkillNames.includes(skill.name)
    );

    return {
      ...config,
      skills: [
        ...CORE_AGENT_SKILLS,
        ...agentSpecificSkills
      ]
    };
  }

  async createAgent(type: string, config: AgentConfig): Promise<BaseAgent> {
    const id = crypto.randomUUID();
    
    // Enrich config with core skills that all agents must have
    const enrichedConfig = this.enrichConfigWithCoreSkills(config);
    
    const agent = this.instantiateAgent(id, type, enrichedConfig);
    
    // Get current user for ownership
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create agents');
    }
    
    await this.storeAgent({
      id,
      type,
      config: enrichedConfig,
      status: 'active',
      user_id: user.id, // Add user ownership
    });

    this.agentCache.set(id, agent);
    return agent;
  }

  async getAgent(id: string): Promise<BaseAgent> {
    if (this.agentCache.has(id)) {
      return this.agentCache.get(id)!;
    }

    const { data: agentData, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Enrich with core skills when loading from database
    const enrichedConfig = this.enrichConfigWithCoreSkills(agentData.config);

    const agent = this.instantiateAgent(
      agentData.id,
      agentData.type,
      enrichedConfig
    );
    
    // If this is a tool-enabled agent, reattach tools
    if (agent instanceof ToolEnabledAgent && agentData.tools) {
      const toolIds = Array.isArray(agentData.tools) ? agentData.tools : [];
      for (const toolId of toolIds) {
        try {
          agent.attachTool(toolId);
        } catch (error) {
          console.warn(`Failed to reattach tool ${toolId} to agent ${id}:`, error);
        }
      }
    }

    this.agentCache.set(id, agent);
    return agent;
  }

  private instantiateAgent(id: string, type: string, config: AgentConfig): BaseAgent {
    switch (type) {
      case 'email':
        return new EmailAgent(id, config);
      case 'meeting':
        return new MeetingAgent(id, config);
      case 'knowledge':
        return new KnowledgeAgent(id, config);
      case 'task':
        return new TaskAgent(id, config);
      case 'direct_execution':
        return new DirectExecutionAgent(id, config);
      case 'productivity':
        return new ProductivityAIAgent(id, config);
      case 'tool_enabled':
        return new ToolEnabledAgent(id, config, toolRegistry);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
  
  /**
   * Create a tool-enabled agent with attached tools
   */
  async createToolEnabledAgent(
    config: AgentConfig,
    toolIds: string[] = [],
    orgContext?: OrganizationContext
  ): Promise<ToolEnabledAgent> {
    const id = crypto.randomUUID();
    const enrichedConfig = this.enrichConfigWithCoreSkills(config);
    
    const agent = new ToolEnabledAgent(id, enrichedConfig, toolRegistry);
    
    // Attach requested tools
    for (const toolId of toolIds) {
      try {
        agent.attachTool(toolId);
      } catch (error) {
        console.warn(`Failed to attach tool ${toolId}:`, error);
      }
    }
    
    // Use provided context or fallback to current context
    const context = orgContext || this.currentOrgContext;
    
    // Get current user for ownership
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create agents');
    }
    
    // Determine visibility based on organization context
    const visibility = context?.visibility || (context?.organizationId ? 'organization' : 'private');
    
    // Store agent using proper normalized schema WITH organization context
    const agentData = {
      id,
      name: enrichedConfig.name || 'Unnamed Agent',
      type: enrichedConfig.type || 'tool_enabled',
      description: enrichedConfig.description || '',
      status: 'active',
      created_by: user.id,
      user_id: user.id, // Owner
      organization_id: context?.organizationId || null, // Organization context
      visibility, // Visibility level
      shared_with: [], // Can be updated later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`🏢 Creating agent with org context:`, {
      id,
      name: agentData.name,
      org: agentData.organization_id,
      visibility: agentData.visibility
    });

    // 1. Store main agent record
    await this.storeAgent(agentData);

    // 2. Store personality traits in separate table
    if (enrichedConfig.personality) {
      await this.storePersonalityTraits(id, enrichedConfig.personality, context?.organizationId);
    }

    // 3. Store skills in separate table
    if (enrichedConfig.skills && enrichedConfig.skills.length > 0) {
      await this.storeAgentSkills(id, enrichedConfig.skills, context?.organizationId);
    }

    // 4. Store workflows in separate table
    if (config.workflows && config.workflows.length > 0) {
      await this.linkAgentWorkflows(id, config.workflows);
    }
    
    this.agentCache.set(id, agent);
    return agent;
  }

  private async storeAgent(data: Record<string, any>): Promise<void> {
    console.log('💾 Storing agent in database:', {
      id: data.id,
      name: data.name,
      type: data.type
    });

    const { error } = await this.supabase
      .from('agents')
      .insert(data);

    if (error) {
      console.error('❌ Error storing agent:', error);
      throw new Error(`Failed to store agent: ${error.message || JSON.stringify(error)}`);
    }

    console.log('✅ Agent stored successfully in database');
  }

  private async storePersonalityTraits(agentId: string, personality: Record<string, number>, organizationId?: string | null): Promise<void> {
    const traits = Object.entries(personality).map(([traitName, traitValue]) => ({
      agent_id: agentId,
      trait_name: traitName,
      trait_value: traitValue,
      organization_id: organizationId || null
    }));

    const { error } = await this.supabase
      .from('agent_personality_traits')
      .insert(traits);

    if (error) {
      console.error('❌ Error storing personality traits:', error);
      throw new Error(`Failed to store personality traits: ${error.message}`);
    }

    console.log(`✅ Stored ${traits.length} personality traits`);
  }

  private async storeAgentSkills(agentId: string, skills: any[], organizationId?: string | null): Promise<void> {
    const skillRecords = skills.map(skill => ({
      agent_id: agentId,
      skill_name: skill.name,
      skill_level: skill.level,
      config: skill.config || {},
      organization_id: organizationId || null
    }));

    const { error } = await this.supabase
      .from('agent_skills')
      .insert(skillRecords);

    if (error) {
      console.error('❌ Error storing agent skills:', error);
      throw new Error(`Failed to store agent skills: ${error.message}`);
    }

    console.log(`✅ Stored ${skillRecords.length} agent skills`);
  }

  private async linkAgentWorkflows(agentId: string, workflowIds: string[]): Promise<void> {
    // Link agent to workflows in agent_workflows table
    const links = workflowIds.map(workflowId => ({
      agent_id: agentId,
      workflow_id: workflowId
    }));

    const { error } = await this.supabase
      .from('agent_workflows')
      .insert(links);

    if (error) {
      console.error('❌ Error linking agent workflows:', error);
      throw new Error(`Failed to link agent workflows: ${error.message}`);
    }

    console.log(`✅ Linked ${workflowIds.length} workflows to agent`);
  }
}