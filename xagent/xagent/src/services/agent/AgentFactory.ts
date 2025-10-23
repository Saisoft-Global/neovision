import { getSupabaseClient } from '../../config/supabase';
import type { AgentConfig, AgentSkill } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { EmailAgent } from './agents/EmailAgent';
import { MeetingAgent } from './agents/MeetingAgent';
import { KnowledgeAgent } from './agents/KnowledgeAgent';
import { TaskAgent } from './agents/TaskAgent';
import { DirectExecutionAgent } from './agents/DirectExecutionAgent';
import { ProductivityAIAgent } from './agents/ProductivityAIAgent';
import { CustomerSupportAgent } from './agents/CustomerSupportAgent';
import { TravelAgent } from './agents/TravelAgent';
import { ToolEnabledAgent } from './ToolEnabledAgent';
import { toolRegistry } from '../tools/ToolRegistry';
import { createWorkforceAgent, WORKFORCE_AGENT_CONFIGS } from '../workforce/WorkforceAgentWrapper';
import { WorkforceLevel } from '../workforce/HierarchicalWorkforceManager';
import { getToolsForAgent } from '../../config/agentToolMapping';

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

export interface WorkforceAgentConfig extends AgentConfig {
  workforce?: {
    level: WorkforceLevel;
    department: string;
    confidenceThreshold?: number;
    maxComplexity?: number;
    humanSupervisor?: string;
    aiSupervisor?: string;
  };
}

export class AgentFactory {
  private static instance: AgentFactory;
  private supabase;
  private agentCache: Map<string, BaseAgent>;
  private currentOrgContext: OrganizationContext | null = null;
  private workforceAgents: Map<string, any> = new Map();

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
        .maybeSingle();  // Use maybeSingle() instead of single() to avoid 406

      if (error) {
        console.error(`Error querying agent ${agentId}:`, error);
        throw new Error(`Agent query failed: ${error.message}`);
      }

      if (!agentData) {
        console.error(`Agent ${agentId} not found in database`);
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

      // ✅ Get organizationId from agent data
      const orgId = agentData.organization_id || null;

      // Create appropriate agent type with organizationId
      let agent: BaseAgent;

      // 🎯 INTELLIGENT AGENT TYPE SELECTION
      // Tool-enabled types get ToolEnabledAgent (can attach tools + browser fallback)
      // Others get specialized agents but still have browser fallback via BaseAgent
      
      const toolEnabledTypes = ['customer_support', 'travel', 'tool_enabled', 'sales', 'finance'];
      const useToolEnabled = toolEnabledTypes.includes(config.type || '');
      
      switch (config.type) {
        case 'email':
          agent = useToolEnabled 
            ? new ToolEnabledAgent(agentId, enrichedConfig, toolRegistry, orgId)
            : new EmailAgent(agentId, enrichedConfig, orgId);
          break;
        case 'meeting':
          agent = new MeetingAgent(agentId, enrichedConfig, orgId);
          break;
        case 'knowledge':
          agent = new KnowledgeAgent(agentId, enrichedConfig, orgId);
          break;
        case 'task':
          agent = new TaskAgent(agentId, enrichedConfig, orgId);
          break;
        case 'productivity':
          agent = new ProductivityAIAgent(agentId, enrichedConfig, orgId);
          break;
        case 'customer_support':
          // ✅ Customer support agents can now use tools (Banking API, CRM, etc.)
          agent = new ToolEnabledAgent(agentId, enrichedConfig, toolRegistry, orgId);
          break;
        case 'sales':
        case 'finance':
          // ✅ Sales and finance agents can use CRM, data tools
          agent = new ToolEnabledAgent(agentId, enrichedConfig, toolRegistry, orgId);
          break;
        case 'travel':
          agent = new TravelAgent(agentId, enrichedConfig, toolRegistry, orgId);  // ✅ Real travel booking
          break;
        case 'tool_enabled':
          agent = new ToolEnabledAgent(agentId, enrichedConfig, toolRegistry, orgId);  // ✅ Pass orgId
          break;
        default:
          // Default to ToolEnabledAgent for maximum flexibility
          agent = new ToolEnabledAgent(agentId, enrichedConfig, toolRegistry, orgId);
      }

      // ✅ SMART TOOL LOADING: Load ONLY tools relevant to this agent type!
      const agentType = config.type || 'general';
      const customTools = (agentData.tools as string[]) || [];
      const relevantToolIds = getToolsForAgent(agentType, customTools);
      
      console.log(`🔧 Agent "${agentType}" loading ${relevantToolIds.length} agent-specific tools`);
      
      // Attach only relevant tools
      let toolsAttached = 0;
      for (const toolId of relevantToolIds) {
        try {
          if ((agent as any).attachTool) {
            await (agent as any).attachTool(toolId);
            toolsAttached++;
            console.log(`   ✅ Attached: ${toolId}`);
          }
        } catch (error) {
          console.warn(`   ⚠️ Failed to attach ${toolId}:`, error);
        }
      }
      
      // Cache the agent instance
      this.agentCache.set(agentId, agent);
      
      console.log(`✅ Agent instance created and cached: ${agentId} (${config.type}) with org: ${orgId || 'none'}, tools: ${toolsAttached}/${relevantToolIds.length}`);
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
      created_by: user.id, // Add user ownership
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
    // ✅ Get organizationId from current context
    const orgId = this.organizationContext?.organizationId || null;

    switch (type) {
      case 'email':
        return new EmailAgent(id, config, orgId);  // ✅ Pass orgId
      case 'meeting':
        return new MeetingAgent(id, config, orgId);  // ✅ Pass orgId
      case 'knowledge':
        return new KnowledgeAgent(id, config, orgId);  // ✅ Pass orgId
      case 'task':
        return new TaskAgent(id, config, orgId);  // ✅ Pass orgId
      case 'direct_execution':
        return new DirectExecutionAgent(id, config, orgId);  // ✅ Pass orgId
      case 'productivity':
        return new ProductivityAIAgent(id, config, orgId);  // ✅ Pass orgId
      case 'tool_enabled':
        return new ToolEnabledAgent(id, config, toolRegistry, orgId);  // ✅ Pass orgId
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
    
    // ✅ Pass organizationId to agent constructor
    const agent = new ToolEnabledAgent(
      id, 
      enrichedConfig, 
      toolRegistry,
      orgContext?.organizationId || this.currentOrgContext?.organizationId || null
    );
    
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
          created_by: user.id, // Owner
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

  // ==================== WORKFORCE CAPABILITIES ====================

  /**
   * Create a workforce-aware agent
   * This extends the existing createToolEnabledAgent with workforce capabilities
   */
  async createWorkforceAgent(
    config: WorkforceAgentConfig,
    tools: any[] = []
  ): Promise<any> {
    // Use existing method to create base agent
    const baseAgent = await this.createToolEnabledAgent(config, tools);

    // If workforce config is provided, wrap with workforce capabilities
    if (config.workforce) {
      const workforceAgent = createWorkforceAgent(baseAgent, config.workforce);
      this.workforceAgents.set(baseAgent.id, workforceAgent);
      
      console.log(`👤 Created workforce agent: ${baseAgent.id} as ${config.workforce.level} in ${config.workforce.department}`);
      return workforceAgent;
    }

    return baseAgent;
  }

  /**
   * Create pre-configured workforce agents
   */
  async createPreconfiguredWorkforceAgents(): Promise<Map<string, any>> {
    const agents = new Map();

    // Customer Service Agents
    const customerSupportWorker = await this.createWorkforceAgent({
      name: 'AI Customer Support Worker',
      type: 'customer_support',
      description: 'Handles routine customer inquiries and support tickets',
      personality: {
        friendliness: 0.9,
        formality: 0.6,
        proactiveness: 0.7,
        detail_orientation: 0.8
      },
      skills: [
        { name: 'customer_service', level: 5 },
        { name: 'ticket_resolution', level: 4 },
        { name: 'faq_handling', level: 5 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.customerSupportWorker
    });

    const customerSupportManager = await this.createWorkforceAgent({
      name: 'AI Customer Support Manager',
      type: 'customer_support',
      description: 'Manages customer support team and handles complex issues',
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.8,
        detail_orientation: 0.9
      },
      skills: [
        { name: 'team_management', level: 5 },
        { name: 'escalation_handling', level: 5 },
        { name: 'policy_interpretation', level: 4 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.customerSupportManager
    });

    // Operations Agents
    const operationsWorker = await this.createWorkforceAgent({
      name: 'AI Operations Worker',
      type: 'operations',
      description: 'Handles data entry and routine operational tasks',
      personality: {
        friendliness: 0.6,
        formality: 0.8,
        proactiveness: 0.7,
        detail_orientation: 0.9
      },
      skills: [
        { name: 'data_entry', level: 5 },
        { name: 'document_processing', level: 4 },
        { name: 'quality_checking', level: 4 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.operationsWorker
    });

    const operationsManager = await this.createWorkforceAgent({
      name: 'AI Operations Manager',
      type: 'operations',
      description: 'Manages operational processes and resource allocation',
      personality: {
        friendliness: 0.7,
        formality: 0.8,
        proactiveness: 0.8,
        detail_orientation: 0.9
      },
      skills: [
        { name: 'process_optimization', level: 5 },
        { name: 'resource_allocation', level: 4 },
        { name: 'workflow_management', level: 5 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.operationsManager
    });

    // HR Agents
    const hrManager = await this.createWorkforceAgent({
      name: 'AI HR Manager',
      type: 'hr',
      description: 'Manages human resources processes and employee lifecycle',
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.7,
        detail_orientation: 0.8
      },
      skills: [
        { name: 'employee_lifecycle', level: 5 },
        { name: 'policy_interpretation', level: 4 },
        { name: 'performance_reviews', level: 4 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.hrManager
    });

    // Finance Agents
    const financeManager = await this.createWorkforceAgent({
      name: 'AI Finance Manager',
      type: 'finance',
      description: 'Manages financial processes and budget decisions',
      personality: {
        friendliness: 0.6,
        formality: 0.9,
        proactiveness: 0.7,
        detail_orientation: 0.9
      },
      skills: [
        { name: 'budget_management', level: 5 },
        { name: 'financial_analysis', level: 4 },
        { name: 'expense_approval', level: 4 }
      ],
      workforce: WORKFORCE_AGENT_CONFIGS.financeManager
    });

    // Store all agents
    agents.set('ai-customer-support-worker', customerSupportWorker);
    agents.set('ai-customer-support-manager', customerSupportManager);
    agents.set('ai-operations-worker', operationsWorker);
    agents.set('ai-operations-manager', operationsManager);
    agents.set('ai-hr-manager', hrManager);
    agents.set('ai-finance-manager', financeManager);

    this.workforceAgents = agents;

    console.log(`🏢 Created ${agents.size} pre-configured workforce agents`);
    return agents;
  }

  /**
   * Process task with automatic agent selection and escalation
   */
  async processTaskWithWorkforce(
    task: any,
    context: any = {}
  ): Promise<{
    success: boolean;
    result?: any;
    agentId?: string;
    escalated: boolean;
    escalationReason?: string;
    humanInteractionId?: string;
  }> {
    // Determine best agent for the task
    const bestAgent = this.selectBestAgentForTask(task, context);
    
    if (!bestAgent) {
      return {
        success: false,
        escalated: true,
        escalationReason: 'No suitable agent found for task'
      };
    }

    console.log(`🎯 Selected agent ${bestAgent.id} for task: ${task.type}`);

    // Process task with selected agent
    const result = await bestAgent.processMessage(task, context);

    if (result.escalated) {
      return {
        success: false,
        escalated: true,
        escalationReason: result.reason,
        humanInteractionId: result.humanInteractionId,
        transferredTo: result.transferredTo
      };
    }

    return {
      success: true,
      result,
      agentId: bestAgent.id
    };
  }

  /**
   * Select best agent for a task based on capabilities and availability
   */
  private selectBestAgentForTask(task: any, context: any): any {
    const agents = Array.from(this.workforceAgents.values());
    
    // Filter agents by department if specified
    let candidateAgents = agents;
    if (task.department) {
      candidateAgents = agents.filter(agent => agent.department === task.department);
    }

    // Filter agents by task type/capabilities
    candidateAgents = candidateAgents.filter(agent => {
      const capabilities = agent.capabilities || [];
      return capabilities.some(cap => 
        cap.name.toLowerCase().includes(task.type?.toLowerCase()) ||
        task.type?.toLowerCase().includes(cap.name.toLowerCase())
      );
    });

    if (candidateAgents.length === 0) {
      return null;
    }

    // Select agent with appropriate level for task complexity
    const taskComplexity = this.assessTaskComplexity(task, context);
    
    // Prefer agents that can handle the complexity without escalation
    const suitableAgents = candidateAgents.filter(agent => 
      agent.maxComplexity >= taskComplexity
    );

    if (suitableAgents.length > 0) {
      // Return the agent with the lowest level that can handle the task
      return suitableAgents.sort((a, b) => {
        const levelOrder = { [WorkforceLevel.WORKER]: 1, [WorkforceLevel.MANAGER]: 2, [WorkforceLevel.DIRECTOR]: 3 };
        return levelOrder[a.workforceLevel] - levelOrder[b.workforceLevel];
      })[0];
    }

    // If no agent can handle without escalation, return the most capable one
    return candidateAgents.sort((a, b) => b.maxComplexity - a.maxComplexity)[0];
  }

  /**
   * Assess task complexity (1-10 scale)
   */
  private assessTaskComplexity(task: any, context: any): number {
    let complexity = 1;

    // Base complexity from task type
    if (task.type?.includes('strategic')) complexity += 3;
    if (task.type?.includes('analysis')) complexity += 2;
    if (task.type?.includes('coordination')) complexity += 2;
    if (task.type?.includes('decision')) complexity += 2;

    // Add complexity based on context
    if (context.stakeholders?.length > 5) complexity += 1;
    if (context.requiresApproval) complexity += 1;
    if (context.budget > 10000) complexity += 2;
    if (context.priority === 'critical') complexity += 1;

    return Math.min(complexity, 10);
  }

  /**
   * Get workforce statistics
   */
  getWorkforceStats(): {
    totalAgents: number;
    agentsByLevel: Record<string, number>;
    agentsByDepartment: Record<string, number>;
    averageConfidence: number;
    averageComplexity: number;
  } {
    const agents = Array.from(this.workforceAgents.values());
    
    const stats = {
      totalAgents: agents.length,
      agentsByLevel: {} as Record<string, number>,
      agentsByDepartment: {} as Record<string, number>,
      averageConfidence: 0,
      averageComplexity: 0
    };

    let totalConfidence = 0;
    let totalComplexity = 0;

    agents.forEach(agent => {
      // Count by level
      stats.agentsByLevel[agent.workforceLevel] = 
        (stats.agentsByLevel[agent.workforceLevel] || 0) + 1;
      
      // Count by department
      stats.agentsByDepartment[agent.department] = 
        (stats.agentsByDepartment[agent.department] || 0) + 1;
      
      // Sum for averages
      totalConfidence += agent.confidenceThreshold;
      totalComplexity += agent.maxComplexity;
    });

    stats.averageConfidence = agents.length > 0 ? totalConfidence / agents.length : 0;
    stats.averageComplexity = agents.length > 0 ? totalComplexity / agents.length : 0;

    return stats;
  }

  /**
   * Get workforce agent by ID
   */
  getWorkforceAgent(agentId: string): any {
    return this.workforceAgents.get(agentId);
  }

  /**
   * Get all workforce agents
   */
  getAllWorkforceAgents(): Map<string, any> {
    return this.workforceAgents;
  }

  /**
   * Get agents by department
   */
  getAgentsByDepartment(department: string): any[] {
    return Array.from(this.workforceAgents.values())
      .filter(agent => agent.department === department);
  }

  /**
   * Get agents by workforce level
   */
  getAgentsByLevel(level: WorkforceLevel): any[] {
    return Array.from(this.workforceAgents.values())
      .filter(agent => agent.workforceLevel === level);
  }
}