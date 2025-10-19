import type { AgentConfig, LLMConfig, AgentSkill } from '../../types/agent-framework';
import type { AgentContext, AgentResponse } from './types';
import { createChatCompletion } from '../openai/chat';
import { WorkflowMatcher } from '../workflow/WorkflowMatcher';
import { EnhancedWorkflowExecutor } from '../workflow/EnhancedWorkflowExecutor';
import { CapabilityManager } from './CapabilityManager';
import { LLMRouter, LLMMessage } from '../llm/LLMRouter';
import type { AgentCapability } from '../../types/agent-framework';
import { VectorSearchService } from '../vectorization/VectorSearchService';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';
import { MemoryService } from '../memory/MemoryService';
import { generateEmbeddings } from '../openai/embeddings';
import { AgentEventBus, type SystemEvent } from '../events/AgentEventBus';
import { GoalManager, type AgentGoal } from './goals/GoalManager';
import { JourneyOrchestrator, type CustomerJourney } from './capabilities/JourneyOrchestrator';
import { SourceCitationEngine, type CitedResponse } from './capabilities/SourceCitationEngine';
import { CollectiveLearning, type AgentLearning } from '../learning/CollectiveLearning';
import { responseCache } from '../cache/ResponseCache';

// RAG Context for every agent interaction
export interface RAGContext {
  vectorResults: Array<{ content: string; score: number; metadata: any }>;
  graphResults: Array<{ nodes: any[]; relations: any[] }>;
  memories: Array<{ content: string; type: string; importance: number }>;
  summarizedHistory: string;
  tokenUsage: { original: number; optimized: number; savings: number };
}

export abstract class BaseAgent {
  protected id: string;
  protected config: AgentConfig;
  protected organizationId: string | null;  // ✅ ADD organization context
  protected workflowMatcher: WorkflowMatcher;
  protected workflowExecutor: EnhancedWorkflowExecutor;
  protected capabilityManager: CapabilityManager;
  protected llmRouter: LLMRouter;
  protected capabilities: AgentCapability[] = [];
  protected isInitialized: boolean = false;
  
  // RAG Components - ALWAYS ACTIVE
  protected vectorSearch: VectorSearchService;
  protected knowledgeGraph: KnowledgeGraphManager;
  protected memoryService: MemoryService;
  
  // Learning Components - SELF-IMPROVEMENT
  protected collectiveLearning: CollectiveLearning;
  protected learningProfile: {
    totalInteractions: number;
    successfulInteractions: number;
    failedInteractions: number;
    avgConfidence: number;
    avgResponseTime: number;
    learningsContributed: number;
    learningsApplied: number;
  };

  constructor(id: string, config: AgentConfig, organizationId: string | null = null) {
    this.id = id;
    this.config = config;
    this.organizationId = organizationId;  // ✅ STORE organization context
    this.workflowMatcher = WorkflowMatcher.getInstance();
    this.workflowExecutor = new EnhancedWorkflowExecutor();
    this.capabilityManager = new CapabilityManager(id);
    this.llmRouter = LLMRouter.getInstance();
    
    // Initialize RAG components with organization context
    this.vectorSearch = VectorSearchService.getInstance();
    this.vectorSearch.setOrganizationContext(organizationId);  // ✅ SET context
    
    this.knowledgeGraph = KnowledgeGraphManager.getInstance();
    this.knowledgeGraph.setOrganizationContext(organizationId);  // ✅ SET context
    
    this.memoryService = MemoryService.getInstance();
    this.memoryService.setOrganizationContext(organizationId);  // ✅ SET context
    
    // Initialize collective learning
    this.collectiveLearning = CollectiveLearning.getInstance();
    this.learningProfile = {
      totalInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      learningsContributed: 0,
      learningsApplied: 0
    };
    
    console.log(`🏢 Agent ${id} initialized with organization: ${organizationId || 'none'}`);
    
    // Auto-initialize capabilities in background
    this.initialize().catch(err => {
      console.warn('Failed to initialize capabilities:', err);
    });
    
    // Load collective learnings for this agent type
    this.loadCollectiveLearnings().catch(err => {
      console.warn('Failed to load collective learnings:', err);
    });
  }

  /**
   * Initialize agent and discover capabilities dynamically
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(`🚀 Initializing agent capabilities: ${this.id}`);
      this.capabilities = await this.capabilityManager.discoverCapabilities();
      console.log(`✅ Agent ${this.id} initialized with ${this.capabilities.length} capabilities`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing capabilities:', error);
      // Continue without capabilities rather than failing
      this.isInitialized = true;
    }
  }

  /**
   * Get all skills including core intelligence skills
   */
  public getSkills() {
    return this.config.skills;
  }

  /**
   * Check if agent has a specific skill
   */
  public hasSkill(skillName: string, minLevel: number = 1): boolean {
    const skill = this.config.skills.find(s => s.name === skillName);
    return skill !== undefined && skill.level >= minLevel;
  }

  /**
   * Get core intelligence capabilities
   * These are the fundamental skills every agent has for understanding and completing work
   */
  public getCoreCapabilities(): string[] {
    const coreSkills = this.config.skills.filter(skill => 
      ['natural_language_understanding', 'natural_language_generation', 
       'task_comprehension', 'reasoning', 'context_retention'].includes(skill.name)
    );
    
    return coreSkills.map(skill => skill.name);
  }

  /**
   * Process user message - intelligently checks for workflow triggers
   * This is the main entry point for agent message handling
   */
  async processMessage(message: string, context: any = {}): Promise<string> {
    try {
      // 1. Check if this message should trigger a workflow
      const workflowMatch = await this.checkForWorkflowTrigger(message, context);

      // 2. If workflow found with high confidence, execute it
      if (workflowMatch && workflowMatch.confidence >= 0.7) {
        console.log(`🔄 [${this.constructor.name}] Triggering workflow: ${workflowMatch.workflow.name}`);
        return await this.executeWorkflowAndRespond(workflowMatch.workflow, message, context);
      }

      // 3. Otherwise, use normal AI response generation
      return await this.generateResponse(message, context);
    } catch (error) {
      console.error('Error processing message:', error);
      return `I encountered an error processing your request. ${error instanceof Error ? error.message : 'Please try again.'}`;
    }
  }

  /**
   * Check if message triggers any of this agent's workflows
   */
  protected async checkForWorkflowTrigger(message: string, context: any) {
    try {
      return await this.workflowMatcher.findWorkflowForIntent(
        this.id,
        message,
        context
      );
    } catch (error) {
      console.error('Error checking workflow trigger:', error);
      return null;
    }
  }

  /**
   * Execute workflow and generate human-friendly response
   */
  protected async executeWorkflowAndRespond(
    workflow: any,
    message: string,
    context: any
  ): Promise<string> {
    const executionContext = {
      userId: context.userId || 'default',
      agentId: this.id,
      inputData: {
        message,
        ...this.extractDataFromPrompt(message),
        ...context,
      },
      credentials: await this.getAPICredentials(),
    };

    console.log(`🚀 Executing workflow: ${workflow.name}`);
    
    const result = await this.workflowExecutor.executeWorkflow(workflow, executionContext);

    if (result.success) {
      return this.formatWorkflowSuccess(workflow, result);
    } else {
      return this.formatWorkflowFailure(workflow, result);
    }
  }

  /**
   * Extract structured data from natural language prompt
   */
  protected extractDataFromPrompt(message: string): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Extract common patterns
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) data.email = emailMatch[0];

    const nameMatch = message.match(/(?:named?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) {
      const fullName = nameMatch[1];
      const parts = fullName.split(' ');
      data.full_name = fullName;
      data.first_name = parts[0];
      if (parts.length > 1) data.last_name = parts.slice(1).join(' ');
    }

    const companyMatch = message.match(/(?:from|at|company|for)\s+([A-Z][a-zA-Z\s&]+)(?:\.|,|$)/);
    if (companyMatch) data.company = companyMatch[1].trim();

    return data;
  }

  /**
   * Get API credentials for third-party integrations
   * Override in subclasses for agent-specific credentials
   */
  protected async getAPICredentials(): Promise<any> {
    return {
      google: import.meta.env.VITE_GOOGLE_WORKSPACE_ACCESS_TOKEN ? {
        accessToken: import.meta.env.VITE_GOOGLE_WORKSPACE_ACCESS_TOKEN,
      } : null,
      salesforce: import.meta.env.VITE_SALESFORCE_ACCESS_TOKEN ? {
        accessToken: import.meta.env.VITE_SALESFORCE_ACCESS_TOKEN,
        instanceUrl: import.meta.env.VITE_SALESFORCE_INSTANCE_URL,
      } : null,
      hrSystem: import.meta.env.VITE_HR_SYSTEM_API_KEY ? {
        apiKey: import.meta.env.VITE_HR_SYSTEM_API_KEY,
        domain: import.meta.env.VITE_HR_SYSTEM_DOMAIN,
      } : null,
    };
  }

  /**
   * Format successful workflow execution
   */
  protected formatWorkflowSuccess(workflow: any, result: any): string {
    const successNodes = result.nodeResults.filter((r: any) => r.success);
    return `✅ ${workflow.name} completed successfully!

Steps executed:
${successNodes.map((n: any) => `  ✓ ${n.nodeName}`).join('\n')}

Execution time: ${result.executionTime}ms`;
  }

  /**
   * Format workflow failure
   */
  protected formatWorkflowFailure(workflow: any, result: any): string {
    const failedNode = result.nodeResults.find((r: any) => !r.success);
    return `❌ Workflow "${workflow.name}" encountered an error at step: ${failedNode?.nodeName}

Error: ${result.error || failedNode?.error}

Would you like me to try again or handle this manually?`;
  }

  /**
   * Select appropriate LLM based on skill being used
   */
  protected async selectLLMForTask(skillName?: string): Promise<LLMConfig> {
    // If skill is specified and has preferred LLM, use it
    if (skillName) {
      const skill = this.config.skills.find(s => s.name === skillName);
      if (skill?.preferred_llm) {
        console.log(`🎯 Using skill-preferred LLM: ${skill.preferred_llm.provider}/${skill.preferred_llm.model}`);
        return skill.preferred_llm;
      }

      // Check for task-specific override
      const llm = this.llmRouter.selectLLMForSkill(
        skill || { name: skillName, level: 3 },
        this.config.llm_config,
        this.config.llm_overrides
      );
      return llm;
    }

    // ⚡ USE GROQ BY DEFAULT IF AVAILABLE (but keep correct fallback)
    const llmConfigManager = (await import('../llm/LLMConfigManager')).LLMConfigManager.getInstance();
    const groqAvailable = llmConfigManager.getProvider('groq')?.isAvailable;
    
    if (groqAvailable && this.config.llm_config?.provider === 'openai') {
      // Override to use Groq if available, with OpenAI fallback
      return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile', // ✅ UPDATED: New Groq model (Oct 2024)
        temperature: this.config.llm_config.temperature || 0.7,
        max_tokens: this.config.llm_config.max_tokens || 2000
      };
    }

    // Use default LLM (ensure correct model for provider)
    return this.config.llm_config;
  }

  /**
   * Execute LLM request with intelligent routing
   */
  protected async executeLLM(
    messages: LLMMessage[],
    skillName?: string
  ): Promise<string> {
    // Select appropriate LLM
    const llmConfig = await this.selectLLMForTask(skillName);
    
    // Get fallback LLM
    const fallback = this.config.fallback_llm || {
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo'
    };

    try {
      // Execute with LLM Router
      return await this.llmRouter.execute(messages, llmConfig, fallback);
    } catch (error) {
      console.error('LLM execution error:', error);
      throw error;
    }
  }

  protected async generateResponse(
    prompt: string,
    context: AgentContext
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    // Use LLM Router for intelligent routing
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Determine which skill is being used (if any)
    const skillName = this.detectSkillFromContext(context);

    return await this.executeLLM(messages, skillName);
  }

  /**
   * Detect which skill is being used from context
   */
  private detectSkillFromContext(context: AgentContext): string | undefined {
    // Simple detection based on context type
    const type = context.type?.toLowerCase() || '';
    
    if (type.includes('research') || type.includes('analysis')) return 'research_analysis';
    if (type.includes('writ') || type.includes('content')) return 'content_writing';
    if (type.includes('code')) return 'code_generation';
    if (type.includes('support')) return 'customer_support';
    
    return undefined;
  }

  private buildSystemPrompt(context: AgentContext): string {
    // Try to use advanced prompt templates first
    try {
      // Dynamic import for prompt templates (avoid require in browser)
      const promptTemplateEngine = (window as any).__promptTemplateEngine;
      const promptFineTuningService = (window as any).__promptFineTuningService;
      
      // Create prompt context with safe defaults
      const promptContext = {
        agent_type: context.type || 'general',
        personality: this.config.personality || {},
        skills: this.config.skills || [],
        conversation_history: context.conversationHistory || [],
        user_preferences: context.userPreferences || {},
        organization_context: {
          industry: context.organization?.industry || 'general',
          company_size: context.organization?.size || 'medium',
          culture: context.organization?.culture || 'professional'
        },
        task_context: {
          domain: context.expertise?.[0] || 'general',
          complexity: this.determineTaskComplexity(context),
          urgency: this.determineTaskUrgency(context)
        }
      };

      // Get best template for this context
      const bestTemplate = promptTemplateEngine.getBestTemplate(promptContext);
      
      if (bestTemplate) {
        // Generate advanced prompt
        const advancedPrompt = promptTemplateEngine.generatePrompt(
          bestTemplate.id, 
          promptContext,
          {
            agent_id: this.id,
            current_time: new Date().toISOString(),
            user_id: context.userId || 'anonymous'
          }
        );

        // Record prompt usage for fine-tuning
        this.recordPromptUsage(bestTemplate.id, promptContext);
        
        return advancedPrompt;
      }
    } catch (error) {
      console.warn('Advanced prompt templates not available, falling back to basic prompt:', error);
    }

    // Fallback to basic prompt if advanced templates aren't available
    return this.buildBasicSystemPrompt(context);
  }

  private buildBasicSystemPrompt(context: AgentContext): string {
    const { personality, skills } = this.config;
    
    // Include skills in system prompt to make agent aware of its capabilities
    const skillsList = skills
      .filter(s => s.level >= 3) // Only include proficient skills (level 3+)
      .map(s => `${s.name} (Level ${s.level})`)
      .join(', ');
    
    const expertiseList = context.expertise ? context.expertise.join(', ') : 'general assistance';
    
    return `You are an AI assistant specializing in ${context.type} with expertise in: ${expertiseList}.

Personality traits:
- Friendliness: ${personality.friendliness * 100}%
- Formality: ${personality.formality * 100}%
- Proactiveness: ${personality.proactiveness * 100}%
- Detail orientation: ${personality.detail_orientation * 100}%

Your skills and capabilities: ${skillsList}

You have advanced natural language understanding, task comprehension, reasoning, and context retention abilities. Use these to understand user intent deeply and provide intelligent, contextual responses.

Adjust your communication style according to your personality traits.`;
  }

  private determineTaskComplexity(context: AgentContext): 'low' | 'medium' | 'high' {
    // Determine complexity based on context
    if (context.expertise && context.expertise.length > 3) return 'high';
    if (context.skills && context.skills.length > 5) return 'high';
    if (context.conversationHistory && context.conversationHistory.length > 10) return 'medium';
    return 'low';
  }

  private determineTaskUrgency(context: AgentContext): 'low' | 'medium' | 'high' {
    // Determine urgency based on context
    if (context.urgency) return context.urgency;
    if (context.conversationHistory && context.conversationHistory.some(msg => 
      msg.content.toLowerCase().includes('urgent') || 
      msg.content.toLowerCase().includes('asap') ||
      msg.content.toLowerCase().includes('emergency')
    )) return 'high';
    return 'medium';
  }

  private recordPromptUsage(templateId: string, context: any): void {
    // Record prompt usage for analytics and fine-tuning
    try {
      const promptFineTuningService = (window as any).__promptFineTuningService;
      
      if (promptFineTuningService) {
        // This would be called after getting a response to collect feedback
        // For now, just log the usage
        console.log(`📊 Prompt usage recorded: ${templateId} for agent ${this.id}`);
      }
    } catch (error) {
      // Fine-tuning service not available
    }
  }

  /**
   * Get available capabilities
   */
  getAvailableCapabilities(): AgentCapability[] {
    return this.capabilities.filter(cap => cap.isAvailable);
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capabilityId: string): boolean {
    return this.capabilityManager.hasCapability(capabilityId);
  }

  /**
   * ✨ RAG-POWERED INTERACTION
   * This method is called for EVERY agent interaction
   * It automatically enriches context using Vector Search + Knowledge Graph + Memory
   */
  protected async buildRAGContext(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId: string
  ): Promise<RAGContext> {
    console.log(`🧠 Building RAG context for: "${userMessage.substring(0, 50)}..."`);
    
    try {
      // Run all RAG components in parallel for speed
      const [vectorResults, graphResults, memories, summarizedHistory] = await Promise.all([
        this.searchVectorStore(userMessage, userId),
        this.searchKnowledgeGraph(userMessage, userId),
        this.searchMemories(userMessage, userId),
        this.summarizeConversation(conversationHistory)
      ]);

      // Calculate token savings
      const originalTokens = this.estimateTokens(JSON.stringify(conversationHistory));
      const optimizedTokens = this.estimateTokens(summarizedHistory);
      const savings = originalTokens - optimizedTokens;

      const ragContext: RAGContext = {
        vectorResults,
        graphResults,
        memories,
        summarizedHistory,
        tokenUsage: {
          original: originalTokens,
          optimized: optimizedTokens,
          savings: Math.max(0, savings)
        }
      };

      console.log(`✅ RAG Context built:`, {
        vectorResults: vectorResults.length,
        graphNodes: graphResults.flatMap(r => r.nodes).length,
        memories: memories.length,
        tokenSavings: ragContext.tokenUsage.savings
      });

      return ragContext;

    } catch (error) {
      console.error('RAG context building error:', error);
      // Return empty context on error
      return {
        vectorResults: [],
        graphResults: [],
        memories: [],
        summarizedHistory: conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n'),
        tokenUsage: { original: 0, optimized: 0, savings: 0 }
      };
    }
  }

  /**
   * Search vector store for relevant documents
   * ✅ NOW WITH ORGANIZATION FILTERING FOR DATA ISOLATION
   */
  private async searchVectorStore(query: string, userId: string): Promise<Array<{ content: string; score: number; metadata: any }>> {
    try {
      // ✅ Build secure filter with organization isolation
      const filter: any = {};

      // CRITICAL: Filter by organization to prevent cross-org data access
      if (this.organizationId) {
        filter.organization_id = { $eq: this.organizationId };
        
        // Add visibility rules for organization-aware filtering
        filter.$or = [
          { visibility: 'organization' },  // Org-shared documents
          { visibility: 'public' },         // Public documents
          { 
            user_id: { $eq: userId },       // User's private documents
            visibility: 'private' 
          }
        ];
      } else {
        // No org context - only user's own documents
        filter.user_id = { $eq: userId };
      }

      console.log(`🔍 Vector search with org filter:`, {
        organizationId: this.organizationId,
        userId,
        hasOrgFilter: !!this.organizationId
      });

      const results = await this.vectorSearch.searchSimilarDocuments(query, {
        filter,
        topK: 5,
        threshold: 0.7
      });

      return results.map(r => ({
        content: r.content,
        score: r.score,
        metadata: r.metadata
      }));
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Search knowledge graph for relevant entities and relationships
   * ✅ NOW WITH ORGANIZATION FILTERING FOR DATA ISOLATION
   */
  private async searchKnowledgeGraph(query: string, userId: string): Promise<Array<{ nodes: any[]; relations: any[] }>> {
    try {
      const result = await this.knowledgeGraph.semanticSearch({
        text: query,
        intent: 'find_entities',
        filters: { 
          organization_id: this.organizationId,  // ✅ ADD organization filter
          userId 
        },
        limit: 5
      });

      return [{
        nodes: result.nodes,
        relations: result.relations
      }];
    } catch (error) {
      console.error('Knowledge graph search error:', error);
      return [];
    }
  }

  /**
   * Search memories for relevant past interactions
   * ✅ NOW WITH ORGANIZATION FILTERING FOR DATA ISOLATION
   */
  private async searchMemories(query: string, userId: string): Promise<Array<{ content: string; type: string; importance: number }>> {
    try {
      const results = await this.memoryService.searchMemories(query, userId, {
        limit: 5,
        threshold: 0.7,
        organizationId: this.organizationId  // ✅ ADD organization context
      });

      return results.map(r => ({
        content: r.content,
        type: r.type || 'unknown',
        importance: r.score || 0.5
      }));
    } catch (error) {
      console.error('Memory search error:', error);
      return [];
    }
  }

  /**
   * Summarize conversation history to optimize tokens
   */
  private async summarizeConversation(history: Array<{ role: string; content: string }>): Promise<string> {
    try {
      // If history is short, no need to summarize
      if (history.length <= 4) {
        return history.map(m => `${m.role}: ${m.content}`).join('\n');
      }

      // Keep recent messages (last 2) and summarize older ones
      const recentMessages = history.slice(-2);
      const olderMessages = history.slice(0, -2);

      if (olderMessages.length === 0) {
        return history.map(m => `${m.role}: ${m.content}`).join('\n');
      }

      // Summarize older messages
      const summaryPrompt = `Summarize this conversation history concisely, preserving key information:

${olderMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Provide a brief summary in 2-3 sentences.`;

      const summary = await createChatCompletion([
        { role: 'system', content: 'You are an expert at summarizing conversations concisely.' },
        { role: 'user', content: summaryPrompt }
      ]);

      // Combine summary with recent messages
      return `[Previous conversation summary: ${summary}]\n\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    } catch (error) {
      console.error('Conversation summarization error:', error);
      return history.map(m => `${m.role}: ${m.content}`).join('\n');
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * ✨ ENHANCED: Generate response with full RAG context
   */
  protected async generateResponseWithRAG(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId: string,
    context: AgentContext
  ): Promise<string> {
    try {
      console.log(`💬 Generating RAG-powered response...`);

      // 1. Build RAG context (Vector + Graph + Memory + Summary)
      const ragContext = await this.buildRAGContext(userMessage, conversationHistory, userId);

      // 2. Build enhanced system prompt with RAG context
      const systemPrompt = this.buildSystemPromptWithRAG(context, ragContext);

      // 3. Build user message with RAG context
      const enhancedUserMessage = this.buildUserMessageWithRAG(userMessage, ragContext);

      // 4. Generate response using LLM
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedUserMessage }
      ];

      const skillName = this.detectSkillFromContext(context);
      const response = await this.executeLLM(messages, skillName);

      // 5. Store interaction in memory for future use (non-blocking)
      // Don't await - let it happen in background so user gets response faster
      this.storeInteraction(userId, userMessage, response, ragContext).catch(error => {
        console.error('Background interaction storage failed:', error);
      });

      console.log(`✅ RAG-powered response generated (${ragContext.tokenUsage.savings} tokens saved)`);

      return response;

    } catch (error) {
      console.error('RAG-powered response generation error:', error);
      throw error;
    }
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPromptWithRAG(context: AgentContext, ragContext: RAGContext): string {
    const basePrompt = this.buildSystemPrompt(context);

    // Add RAG context to system prompt
    let ragPrompt = basePrompt + '\n\n';

    // Add relevant documents from vector search
    if (ragContext.vectorResults.length > 0) {
      ragPrompt += `\n📚 RELEVANT DOCUMENTS:\n`;
      ragContext.vectorResults.forEach((doc, i) => {
        ragPrompt += `${i + 1}. ${doc.content.substring(0, 200)}... (relevance: ${(doc.score * 100).toFixed(0)}%)\n`;
      });
    }

    // Add knowledge from knowledge graph
    if (ragContext.graphResults.length > 0 && ragContext.graphResults[0].nodes.length > 0) {
      ragPrompt += `\n🧠 KNOWLEDGE GRAPH:\n`;
      const nodes = ragContext.graphResults[0].nodes.slice(0, 5);
      nodes.forEach(node => {
        ragPrompt += `- ${node.label}: ${node.type}\n`;
      });
    }

    // Add relevant memories
    if (ragContext.memories.length > 0) {
      ragPrompt += `\n💭 RELEVANT MEMORIES:\n`;
      ragContext.memories.forEach((mem, i) => {
        ragPrompt += `${i + 1}. ${mem.content.substring(0, 150)}... (${mem.type})\n`;
      });
    }

    // Add conversation summary
    if (ragContext.summarizedHistory) {
      ragPrompt += `\n📝 CONVERSATION CONTEXT:\n${ragContext.summarizedHistory}\n`;
    }

    ragPrompt += `\nUse the above context to provide accurate, contextual responses.`;

    return ragPrompt;
  }

  /**
   * ✨ NEW: Generate response with citations, sources, and proactive suggestions
   * This is called automatically for ALL agents
   * ✨ NOW WITH AUTOMATIC LEARNING!
   */
  async generateEnhancedResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId: string,
    agentContext?: AgentContext
  ): Promise<string> {
    const startTime = Date.now();
    let success = false;
    let confidence = 0.5;
    let workflowExecuted: string | undefined;
    let toolsUsed: string[] = [];

    try {
      console.log(`🌟 [OPTIMIZED] Generating enhanced response with all features...`);
      
      // Helper function to add timeout to promises
      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, defaultValue: T, name: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]).catch(err => {
          console.warn(`⚠️ ${name} failed:`, err.message);
          return defaultValue;
        });
      };
      
      // ⚡ OPTIMIZATION 1: PARALLELIZE INDEPENDENT OPERATIONS WITH TIMEOUTS
      // Run collective learning, RAG context, and journey lookup in parallel
      console.log('🔄 Starting parallel operations...');
      
      const [appliedLearnings, ragContext, existingJourney] = await Promise.all([
        // Collective learning (3s timeout - reduced for speed)
        (async () => {
          console.log('  📚 Starting collective learning...');
          const result = await withTimeout(
            this.applyCollectiveLearnings(userMessage),
            3000,  // Reduced from 10s to 3s
            [],
            'Collective learning'
          );
          console.log('  ✅ Collective learning complete:', result.length, 'learnings');
          return result;
        })(),
        
        // RAG context (10s timeout)
        (async () => {
          console.log('  🧠 Starting RAG context build...');
          const result = await withTimeout(
            this.buildRAGContext(userMessage, conversationHistory, userId),
            10000,
            { vectorResults: [], graphResults: [], memories: [], summarizedHistory: '', tokenUsage: { original: 0, optimized: 0, savings: 0 } },
            'RAG context'
          );
          console.log('  ✅ RAG context complete:', result.vectorResults.length, 'vectors');
          return result;
        })(),
        
        // Journey lookup (5s timeout)
        (async () => {
          console.log('  🗺️ Starting journey lookup...');
          const result = await withTimeout(
            (async () => {
              const journeyOrchestrator = JourneyOrchestrator.getInstance();
              return await journeyOrchestrator.getActiveJourney(userId, this.id);
            })(),
            5000,
            null,
            'Journey lookup'
          );
          console.log('  ✅ Journey lookup complete:', result ? 'found' : 'not found');
          return result;
        })()
      ]);
      
      console.log(`⚡ Parallel operations completed in ${Date.now() - startTime}ms`);
      
      // Create journey if it doesn't exist (only if needed)
      let journey = existingJourney;
      if (!journey) {
        const journeyOrchestrator = JourneyOrchestrator.getInstance();
        journey = await journeyOrchestrator.startJourney(userId, this.id, this.getName(), userMessage);
      }
      
      // 3. Generate base response using existing RAG method
      const baseResponse = await this.generateResponseWithRAG(
        userMessage,
        conversationHistory,
        userId,
        agentContext || {} as AgentContext
      );
      
      // 4. Enhance with citations
      const citationEngine = SourceCitationEngine.getInstance();
      const citedResponse = await citationEngine.enhanceResponseWithCitations(
        baseResponse,
        ragContext,
        userMessage
      );
      
      // 5. Format with sources, links, and suggestions
      const formattedResponse = citationEngine.formatCitedResponse(citedResponse);
      
      // ⚡ OPTIMIZATION 2: BATCH JOURNEY UPDATES (PARALLEL)
      // Run all journey updates in parallel instead of sequentially
      const journeyOrchestrator = JourneyOrchestrator.getInstance();
      
      const journeyUpdatePromises: Promise<any>[] = [
        // Add journey step
        journeyOrchestrator.addJourneyStep(journey.id, {
          description: `Answered: ${userMessage.substring(0, 50)}...`,
          action_type: 'information',
          result: { sources_count: citedResponse.sources.length }
        }).catch(err => console.warn('Journey step update failed:', err))
      ];
      
      // Add related documents if any
      if (citedResponse.sources?.length > 0) {
        journeyUpdatePromises.push(
          journeyOrchestrator.addRelatedDocuments(journey.id, citedResponse.sources)
            .catch(err => console.warn('Related documents update failed:', err))
        );
      }
      
      // Add suggested actions if any
      if (citedResponse.suggested_actions?.length > 0) {
        journeyUpdatePromises.push(
          journeyOrchestrator.suggestNextActions(journey.id, citedResponse.suggested_actions)
            .catch(err => console.warn('Suggestions update failed:', err))
        );
      }
      
      // ⚡ OPTIMIZATION 3: NON-BLOCKING JOURNEY UPDATES
      // Don't wait for journey updates - run in background
      Promise.all(journeyUpdatePromises).then(() => {
        console.log('✅ Journey updates completed in background');
      });
      
      // 7. Record success metrics
      success = true;
      confidence = citedResponse.metadata?.confidence_score || 0.8;
      workflowExecuted = citedResponse.suggested_actions?.find((a: any) => a.workflow_id)?.workflow_id;
      
      const timeTaken = Date.now() - startTime;
      console.log(`✅ Enhanced response generated in ${timeTaken}ms (with all features)`);
      
      // ⚡ OPTIMIZATION 4: NON-BLOCKING LEARNING RECORDING
      // Record learning in background - don't block response
      this.recordLearningFromInteraction(
        userMessage,
        formattedResponse,
        success,
        confidence,
        timeTaken,
        workflowExecuted,
        toolsUsed
      ).catch(err => console.warn('Learning recording failed:', err));
      
      return formattedResponse;
      
    } catch (error) {
      console.error('Enhanced response generation failed:', error);
      
      // Record failure learning
      const timeTaken = Date.now() - startTime;
      this.recordLearningFromInteraction(
        userMessage,
        `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        false,
        0.0,
        timeTaken
      ).catch(err => console.warn('Learning recording failed:', err));
      
      // Fallback to basic RAG response
      return await this.generateResponseWithRAG(userMessage, conversationHistory, userId, agentContext || {} as AgentContext);
    }
  }

  /**
   * Build user message with RAG context hints
   */
  private buildUserMessageWithRAG(userMessage: string, ragContext: RAGContext): string {
    let enhancedMessage = userMessage;

    // Add context hints if relevant information was found
    if (ragContext.vectorResults.length > 0 || ragContext.memories.length > 0) {
      enhancedMessage += `\n\n[Note: I have access to ${ragContext.vectorResults.length} relevant documents and ${ragContext.memories.length} memories that may help answer this question.]`;
    }

    return enhancedMessage;
  }

  /**
   * Build system prompt with journey context
   */
  private buildSystemPromptWithJourney(ragContext: RAGContext, journey: CustomerJourney): string {
    let prompt = this.buildSystemPromptWithRAG({} as AgentContext, ragContext);

    // Add journey context
    prompt += `\n\n🎯 JOURNEY CONTEXT:\n`;
    prompt += `Intent: ${journey.intent}\n`;
    prompt += `Stage: ${journey.current_stage}\n`;
    
    if (journey.completed_steps.length > 0) {
      prompt += `Completed steps: ${journey.completed_steps.map(s => s.description).join(', ')}\n`;
    }
    
    if (journey.pending_steps.length > 0) {
      prompt += `Pending steps: ${journey.pending_steps.map(s => s.description).join(', ')}\n`;
    }

    prompt += `\nWhen providing your response:
1. Always cite sources with document names and URLs
2. Provide relevant links and forms
3. Suggest logical next steps
4. Anticipate user's ultimate goal
5. Offer to automate multi-step processes`;

    return prompt;
  }

  /**
   * Format journey context as message
   */
  private formatJourneyContext(journey: CustomerJourney): string {
    return `Current journey: ${journey.intent} (${journey.current_stage})
Completed: ${journey.completed_steps.length} steps
Pending: ${journey.pending_steps.length} steps
Related documents available: ${journey.related_documents.length}`;
  }

  /**
   * Store interaction for future RAG retrieval
   */
  private async storeInteraction(
    userId: string,
    userMessage: string,
    agentResponse: string,
    ragContext: RAGContext
  ): Promise<void> {
    try {
      // Store in memory service
      await this.memoryService.storeMemory({
        userId,
        type: 'conversation',
        content: {
          userMessage,
          agentResponse,
          timestamp: new Date().toISOString(),
          agentId: this.id,
          tokenSavings: ragContext.tokenUsage.savings
        },
        metadata: {
          vectorResultsCount: ragContext.vectorResults.length,
          memoriesCount: ragContext.memories.length,
          ragUsed: true
        }
      });

      console.log(`💾 Interaction stored for future RAG retrieval`);
    } catch (error) {
      console.error('Interaction storage error:', error);
      // Don't throw - storage failure shouldn't break the response
    }
  }

  /**
   * Find capabilities by intent
   */
  findCapabilitiesByIntent(intent: string): AgentCapability[] {
    return this.capabilityManager.findCapabilitiesByIntent(intent);
  }

  /**
   * Get capability report (for debugging/admin)
   */
  getCapabilityReport(): string {
    return this.capabilityManager.generateCapabilityReport();
  }

  /**
   * Get specific capability
   */
  getCapability(capabilityId: string): AgentCapability | undefined {
    return this.capabilityManager.getCapability(capabilityId);
  }

  // ============ AUTONOMOUS OPERATION CAPABILITIES ============

  /**
   * Get agent ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get agent name
   */
  public getName(): string {
    return this.config.name || `Agent-${this.id}`;
  }

  /**
   * Autonomous run - called by scheduler
   * Agents can override this to implement custom autonomous behavior
   */
  async autonomousRun(): Promise<{ success: boolean; actions: string[] }> {
    const actions: string[] = [];

    try {
      console.log(`🤖 [${this.getName()}] Starting autonomous run...`);

      // 1. Check and progress active goals
      const goalsProgressed = await this.checkActiveGoals();
      if (goalsProgressed > 0) {
        actions.push(`Progressed ${goalsProgressed} active goals`);
      }

      // 2. Process any pending workflows
      const workflowsExecuted = await this.checkScheduledWorkflows();
      if (workflowsExecuted > 0) {
        actions.push(`Executed ${workflowsExecuted} scheduled workflows`);
      }

      // 3. Perform agent-specific autonomous tasks (override in subclass)
      const customActions = await this.performAutonomousTasks();
      actions.push(...customActions);

      console.log(`✅ [${this.getName()}] Autonomous run complete: ${actions.length} actions`);

      return { success: true, actions };

    } catch (error) {
      console.error(`❌ [${this.getName()}] Autonomous run failed:`, error);
      return { success: false, actions };
    }
  }

  /**
   * Check and progress active goals
   */
  protected async checkActiveGoals(): Promise<number> {
    try {
      const goalManager = GoalManager.getInstance();
      const activeGoals = await goalManager.getActiveGoals(this.id);

      if (activeGoals.length === 0) {
        return 0;
      }

      console.log(`🎯 Checking ${activeGoals.length} active goals...`);

      let progressed = 0;

      for (const goal of activeGoals) {
        // Check if goal is approaching deadline
        if (goal.deadline) {
          const daysUntil = Math.ceil(
            (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil <= 7 && daysUntil > 0) {
            console.log(`⏰ Goal approaching deadline (${daysUntil} days): ${goal.description}`);
            // Take proactive action
            await this.handleGoalDeadlineApproaching(goal, daysUntil);
            progressed++;
          }
        }

        // Check for incomplete milestones
        const incompleteMilestones = goal.milestones.filter(m => !m.completed);
        if (incompleteMilestones.length > 0) {
          // Try to complete next milestone
          const nextMilestone = incompleteMilestones[0];
          const completed = await this.attemptMilestoneCompletion(goal, nextMilestone);
          if (completed) {
            progressed++;
          }
        }
      }

      return progressed;

    } catch (error) {
      console.error('Error checking active goals:', error);
      return 0;
    }
  }

  /**
   * Handle goal deadline approaching
   */
  protected async handleGoalDeadlineApproaching(
    goal: AgentGoal,
    daysUntil: number
  ): Promise<void> {
    // Default: just log
    // Subclasses can override for custom behavior (e.g., send notification)
    console.log(`⚠️ Reminder: Goal "${goal.description}" due in ${daysUntil} days`);
  }

  /**
   * Attempt to complete a milestone
   */
  protected async attemptMilestoneCompletion(
    goal: AgentGoal,
    milestone: any
  ): Promise<boolean> {
    // Default implementation - subclasses should override
    return false;
  }

  /**
   * Check for scheduled workflows
   */
  protected async checkScheduledWorkflows(): Promise<number> {
    // TODO: Implement workflow scheduling system
    return 0;
  }

  /**
   * Perform agent-specific autonomous tasks
   * Override in subclass for custom autonomous behavior
   */
  protected async performAutonomousTasks(): Promise<string[]> {
    // Default: no custom tasks
    // Subclasses override this for specific behavior
    return [];
  }

  /**
   * Handle system event
   * Called when subscribed event is emitted
   */
  async handleEvent(event: SystemEvent): Promise<void> {
    console.log(`📩 [${this.getName()}] Received event: ${event.type}`);

    try {
      // Analyze event and decide how to respond
      const shouldRespond = await this.shouldRespondToEvent(event);

      if (shouldRespond) {
        await this.respondToEvent(event);
      }

    } catch (error) {
      console.error(`Error handling event:`, error);
    }
  }

  /**
   * Determine if agent should respond to event
   */
  protected async shouldRespondToEvent(event: SystemEvent): Promise<boolean> {
    // Default: respond to all events
    // Subclasses can override for intelligent filtering
    return true;
  }

  /**
   * Respond to event
   */
  protected async respondToEvent(event: SystemEvent): Promise<void> {
    // Default implementation - log
    // Subclasses should override
    console.log(`Handling event: ${event.type}`, event.data);
  }

  /**
   * Subscribe to event type
   */
  subscribeToEvent(eventType: string, handler?: (event: SystemEvent) => Promise<void>): void {
    const eventBus = AgentEventBus.getInstance();
    
    const eventHandler = handler || this.handleEvent.bind(this);
    
    eventBus.subscribe(eventType, this, eventHandler);
    
    console.log(`📌 [${this.getName()}] Subscribed to: ${eventType}`);
  }

  /**
   * Unsubscribe from event type
   */
  unsubscribeFromEvent(eventType: string): void {
    const eventBus = AgentEventBus.getInstance();
    eventBus.unsubscribe(eventType, this);
    
    console.log(`📍 [${this.getName()}] Unsubscribed from: ${eventType}`);
  }

  // ============ COLLECTIVE LEARNING CAPABILITIES ============

  /**
   * Load collective learnings on initialization
   */
  protected async loadCollectiveLearnings(): Promise<void> {
    try {
      const learnings = await this.collectiveLearning.onboardNewAgent(
        this.config.type || 'general',
        this.config.domain
      );

      if (learnings.length > 0) {
        console.log(`🎓 [${this.getName()}] Loaded ${learnings.length} collective learnings`);
        console.log(`   From ${new Set(learnings.map(l => l.agent_name)).size} different agents`);
      }

    } catch (error) {
      console.warn('Failed to load collective learnings:', error);
    }
  }

  /**
   * Record learning from interaction (called automatically after each response)
   */
  protected async recordLearningFromInteraction(
    userMessage: string,
    agentResponse: string,
    success: boolean,
    confidence: number,
    timeTaken: number,
    workflowExecuted?: string,
    toolsUsed?: string[]
  ): Promise<void> {
    try {
      // Update personal stats
      this.learningProfile.totalInteractions++;
      
      if (success) {
        this.learningProfile.successfulInteractions++;
      } else {
        this.learningProfile.failedInteractions++;
      }

      // Update averages
      const totalInteractions = this.learningProfile.totalInteractions;
      this.learningProfile.avgConfidence = (
        (this.learningProfile.avgConfidence * (totalInteractions - 1)) + confidence
      ) / totalInteractions;

      this.learningProfile.avgResponseTime = (
        (this.learningProfile.avgResponseTime * (totalInteractions - 1)) + timeTaken
      ) / totalInteractions;

      // Extract learning if significant
      const learning = await this.collectiveLearning.extractLearningFromInteraction({
        agent_id: this.id,
        agent_type: this.config.type || 'general',
        agent_name: this.getName(),
        user_message: userMessage,
        agent_response: agentResponse,
        success,
        confidence,
        time_taken_ms: timeTaken,
        workflow_executed: workflowExecuted,
        tools_used: toolsUsed
      });

      // Contribute to collective if learning extracted
      if (learning) {
        await this.collectiveLearning.contribute(learning);
        this.learningProfile.learningsContributed++;
        
        console.log(`🧠 [LEARNING] Contributed new learning: ${learning.pattern_description}`);
      }

    } catch (error) {
      console.error('Error recording learning:', error);
      // Don't throw - learning failure shouldn't break agent
    }
  }

  /**
   * Query and apply collective learnings before making decisions
   */
  protected async applyCollectiveLearnings(context: string): Promise<AgentLearning[]> {
    try {
      // ⚡ OPTIMIZATION 5: CACHE COLLECTIVE LEARNINGS
      const cached = responseCache.getLearnings(context, this.id);
      if (cached) {
        return cached;
      }
      
      const learnings = await this.collectiveLearning.getRelevantLearnings(
        this.config.type || 'general',
        context,
        5  // Top 5 most relevant
      );

      // Cache the results
      responseCache.setLearnings(context, this.id, learnings);

      if (learnings.length > 0) {
        console.log(`💡 [${this.getName()}] Applying ${learnings.length} learnings from other agents:`);
        
        learnings.forEach((l, i) => {
          console.log(`   ${i + 1}. From ${l.agent_name}: ${l.pattern_description}`);
          console.log(`      Success rate: ${(l.success_rate * 100).toFixed(0)}%, Used ${l.usage_count} times`);
        });

        this.learningProfile.learningsApplied += learnings.length;

        // Record usage (non-blocking)
        Promise.all(learnings.map(l => this.collectiveLearning.recordUsage(l.id)))
          .catch(err => console.warn('Failed to record learning usage:', err));
      }

      return learnings;

    } catch (error) {
      console.error('Error applying learnings:', error);
      return [];
    }
  }

  /**
   * Get learning profile statistics
   */
  public getLearningProfile() {
    return {
      ...this.learningProfile,
      successRate: this.learningProfile.totalInteractions > 0
        ? this.learningProfile.successfulInteractions / this.learningProfile.totalInteractions
        : 0
    };
  }

  /**
   * Share a specific insight with other agents
   */
  protected async shareInsight(insight: {
    pattern: string;
    domain: string;
    solution: string;
    applicable_to: string[];
  }): Promise<void> {
    try {
      await this.collectiveLearning.contribute({
        agent_id: this.id,
        agent_type: this.config.type || 'general',
        agent_name: this.getName(),
        learning_type: 'insight',
        domain: insight.domain,
        pattern_description: insight.pattern,
        context: {},
        solution: insight.solution,
        success_rate: 1.0,
        confidence: 0.8,
        applicable_to: insight.applicable_to
      });

      console.log(`💡 [SHARED] Insight shared: ${insight.pattern}`);

    } catch (error) {
      console.error('Error sharing insight:', error);
    }
  }

  abstract execute(action: string, params: Record<string, unknown>): Promise<AgentResponse>;
}