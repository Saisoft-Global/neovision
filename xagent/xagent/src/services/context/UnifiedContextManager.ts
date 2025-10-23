/**
 * Unified Context Manager
 * Central system for ensuring context accuracy across all agents
 * Combines conversation history, document context, shared context, and memory
 */

import { ConversationContextManager } from '../conversation/ConversationContextManager';
import { DocumentContextManager } from '../chat/context/DocumentContextManager';
import { SharedContext } from './SharedContext';
import { MemoryService } from '../memory/MemoryService';
import type { ChatMessage } from '../llm/types';
import type { Agent } from '../../types/agent';

export interface UnifiedContext {
  // Core identifiers
  threadId: string;
  userId: string;
  agentId: string;
  timestamp: Date;

  // Conversation context
  conversationHistory: ChatMessage[];
  tokenStats: {
    currentTokens: number;
    maxTokens: number;
    usagePercentage: number;
  };

  // Document context
  activeDocument: any | null;
  allDocuments: any[];
  documentContextString: string;

  // Shared context (cross-agent)
  sharedData: Record<string, any>;
  
  // Memory context
  relevantMemories: any[];
  userProfile: any | null;

  // Agent-specific context
  agentExpertise: string[];
  agentPersonality: any;
  agentCapabilities: string[];
  domainKnowledge: any[];

  // Metadata
  contextVersion: string;
  lastUpdated: Date;
  contextHash: string;
}

export interface ContextSyncOptions {
  includeDocuments?: boolean;
  includeMemories?: boolean;
  includeSharedContext?: boolean;
  maxTokens?: number;
  forceRefresh?: boolean;
}

export class UnifiedContextManager {
  private static instance: UnifiedContextManager;
  
  private conversationManager: ConversationContextManager;
  private documentManager: DocumentContextManager;
  private sharedContext: SharedContext;
  private memoryService: MemoryService;

  // Context cache to avoid rebuilding
  private contextCache: Map<string, UnifiedContext> = new Map();
  
  // Context version tracking
  private contextVersions: Map<string, number> = new Map();

  private constructor() {
    this.conversationManager = ConversationContextManager.getInstance();
    this.documentManager = DocumentContextManager.getInstance();
    this.sharedContext = SharedContext.getInstance();
    this.memoryService = MemoryService.getInstance();

    console.log('🔄 UnifiedContextManager initialized');
  }

  public static getInstance(): UnifiedContextManager {
    if (!this.instance) {
      this.instance = new UnifiedContextManager();
    }
    return this.instance;
  }

  /**
   * Build complete unified context for an agent
   * This is the SINGLE SOURCE OF TRUTH for all agent context
   */
  async buildUnifiedContext(
    threadId: string,
    userId: string,
    agent: Agent,
    currentMessage: string,
    options: ContextSyncOptions = {}
  ): Promise<UnifiedContext> {
    const startTime = Date.now();
    console.log(`🔄 Building unified context for thread: ${threadId}`);

    const {
      includeDocuments = true,
      includeMemories = true,
      includeSharedContext = true,
      maxTokens,
      forceRefresh = false
    } = options;

    // Check cache first (unless force refresh)
    const cacheKey = this.getCacheKey(threadId, userId, agent.id);
    if (!forceRefresh && this.contextCache.has(cacheKey)) {
      const cached = this.contextCache.get(cacheKey)!;
      const age = Date.now() - cached.lastUpdated.getTime();
      
      // Use cache if less than 30 seconds old
      if (age < 30000) {
        console.log(`✅ Using cached context (${age}ms old)`);
        return cached;
      }
    }

    // Build system prompt for agent
    const systemPrompt = this.buildSystemPrompt(agent);

    // 1. Get conversation context with history
    const conversationContext = await this.conversationManager.buildMessageContext(
      threadId,
      currentMessage,
      userId,
      systemPrompt,
      maxTokens ? this.getModelForTokenLimit(maxTokens) : 'gpt-4-turbo-preview'
    );

    // 2. Get document context (if enabled)
    let activeDocument = null;
    let allDocuments: any[] = [];
    let documentContextString = '';

    if (includeDocuments) {
      activeDocument = this.documentManager.getActiveDocument(threadId);
      allDocuments = this.documentManager.getThreadDocuments(threadId);
      
      if (activeDocument) {
        documentContextString = this.documentManager.buildDocumentContextString(threadId);
        console.log(`📄 Including document context: ${activeDocument.fileName}`);
      }
    }

    // 3. Get shared context (cross-agent data)
    let sharedData: Record<string, any> = {};
    if (includeSharedContext) {
      sharedData = await this.getSharedContextData(threadId);
    }

    // 4. Build unified context object
    const unifiedContext: UnifiedContext = {
      // Core identifiers
      threadId,
      userId,
      agentId: agent.id,
      timestamp: new Date(),

      // Conversation context
      conversationHistory: conversationContext.messages,
      tokenStats: conversationContext.tokenStats,

      // Document context
      activeDocument,
      allDocuments,
      documentContextString,

      // Shared context
      sharedData,

      // Memory context
      relevantMemories: conversationContext.relevantMemories,
      userProfile: await this.getUserProfile(userId),

      // Agent-specific context
      agentExpertise: agent.expertise || [],
      agentPersonality: agent.personality,
      agentCapabilities: this.getAgentCapabilities(agent.type),
      domainKnowledge: [],

      // Metadata
      contextVersion: this.incrementContextVersion(threadId),
      lastUpdated: new Date(),
      contextHash: this.generateContextHash(threadId, userId, agent.id)
    };

    // Store in cache
    this.contextCache.set(cacheKey, unifiedContext);

    const duration = Date.now() - startTime;
    console.log(`✅ Unified context built in ${duration}ms`);
    console.log(`📊 Context stats:`, {
      messages: unifiedContext.conversationHistory.length,
      documents: unifiedContext.allDocuments.length,
      memories: unifiedContext.relevantMemories.length,
      tokens: unifiedContext.tokenStats.currentTokens
    });

    return unifiedContext;
  }

  /**
   * Synchronize context between agents
   * Ensures Agent B has all the context from Agent A
   */
  async synchronizeAgentContext(
    sourceThreadId: string,
    targetThreadId: string,
    sourceAgent: Agent,
    targetAgent: Agent,
    transferData?: Record<string, any>
  ): Promise<void> {
    console.log(`🔄 Synchronizing context: ${sourceAgent.id} → ${targetAgent.id}`);

    // Get source context
    const sourceContext = this.contextCache.get(
      this.getCacheKey(sourceThreadId, sourceAgent.id, sourceAgent.id)
    );

    if (!sourceContext) {
      console.warn('⚠️ Source context not found, skipping sync');
      return;
    }

    // Build sync payload
    const syncPayload = {
      // Core conversation summary
      conversationSummary: this.summarizeConversation(sourceContext.conversationHistory),
      
      // Document references
      documents: sourceContext.allDocuments.map(doc => ({
        id: doc.documentId,
        fileName: doc.fileName,
        summary: doc.summary,
        structuredData: doc.structuredData
      })),
      
      // Key findings from memories
      keyInsights: sourceContext.relevantMemories.map(m => m.content),
      
      // Custom transfer data
      transferData: transferData || {},
      
      // Metadata
      sourceAgent: {
        id: sourceAgent.id,
        type: sourceAgent.type,
        name: sourceAgent.name
      },
      syncedAt: new Date()
    };

    // Store in shared context for target agent
    await this.sharedContext.set(
      `sync_${targetThreadId}_from_${sourceThreadId}`,
      syncPayload
    );

    console.log(`✅ Context synchronized to thread: ${targetThreadId}`);
  }

  /**
   * Get context for agent handoff
   * Used when transferring conversation from one agent to another
   */
  async getHandoffContext(
    threadId: string,
    fromAgent: Agent,
    toAgent: Agent
  ): Promise<string> {
    console.log(`🔄 Preparing handoff: ${fromAgent.name} → ${toAgent.name}`);

    const context = this.contextCache.get(
      this.getCacheKey(threadId, fromAgent.id, fromAgent.id)
    );

    if (!context) {
      return 'No previous context available.';
    }

    // Build handoff summary
    const handoffParts = [
      `=== AGENT HANDOFF ===`,
      `From: ${fromAgent.name} (${fromAgent.type})`,
      `To: ${toAgent.name} (${toAgent.type})`,
      ``,
      `CONVERSATION SUMMARY:`,
      this.summarizeConversation(context.conversationHistory),
      ``
    ];

    if (context.activeDocument) {
      handoffParts.push(
        `ACTIVE DOCUMENT:`,
        `• ${context.activeDocument.fileName} (${context.activeDocument.documentType})`,
        `• Summary: ${context.activeDocument.summary}`,
        ``
      );
    }

    if (context.relevantMemories.length > 0) {
      handoffParts.push(
        `KEY CONTEXT FROM MEMORY:`,
        ...context.relevantMemories.slice(0, 3).map(m => `• ${m.content}`),
        ``
      );
    }

    handoffParts.push(
      `USER GOAL:`,
      this.inferUserGoal(context.conversationHistory),
      ``
    );

    return handoffParts.join('\n');
  }

  /**
   * Update shared context that all agents can access
   */
  async updateSharedContext(
    threadId: string,
    key: string,
    value: any
  ): Promise<void> {
    const sharedKey = `${threadId}_${key}`;
    await this.sharedContext.set(sharedKey, value);
    
    // Invalidate cache for this thread
    this.invalidateThreadCache(threadId);
    
    console.log(`✅ Updated shared context: ${key}`);
  }

  /**
   * Get shared context data for a thread
   */
  private async getSharedContextData(threadId: string): Promise<Record<string, any>> {
    try {
      // Get all shared context keys for this thread
      const data: Record<string, any> = {};
      
      // Common shared context keys
      const keys = [
        'user_preferences',
        'task_state',
        'workflow_data',
        'automation_state'
      ];

      for (const key of keys) {
        const sharedKey = `${threadId}_${key}`;
        const value = await this.sharedContext.get(sharedKey);
        if (value) {
          data[key] = value;
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to get shared context:', error);
      return {};
    }
  }

  /**
   * Build system prompt for agent
   */
  private buildSystemPrompt(agent: Agent): string {
    const personality = agent.personality || {};
    
    return `You are ${agent.name}, a specialized AI assistant.

Type: ${agent.type}
Expertise: ${agent.expertise?.join(', ') || 'General assistance'}

Personality Traits:
- Friendliness: ${(personality.friendliness || 0.8) * 100}%
- Formality: ${(personality.formality || 0.7) * 100}%
- Proactiveness: ${(personality.proactiveness || 0.6) * 100}%
- Detail Orientation: ${(personality.detail_orientation || 0.8) * 100}%

Your role is to provide expert assistance in your domain while maintaining your personality traits.
Always consider the full conversation context, any uploaded documents, and relevant memories when responding.`;
  }

  /**
   * Get agent capabilities
   */
  private getAgentCapabilities(type: string): string[] {
    const capabilities: Record<string, string[]> = {
      hr: ['policy_lookup', 'employee_data_access', 'benefit_calculation', 'performance_review'],
      finance: ['financial_analysis', 'investment_recommendation', 'risk_assessment', 'tax_calculation'],
      technical: ['code_review', 'architecture_design', 'debugging', 'security_assessment'],
      productivity: ['email_management', 'calendar_optimization', 'task_prioritization', 'meeting_scheduling'],
      knowledge: ['information_retrieval', 'semantic_search', 'document_analysis', 'knowledge_synthesis'],
      automation: ['browser_automation', 'desktop_control', 'workflow_execution', 'process_automation']
    };

    return capabilities[type] || ['general_assistance'];
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any | null> {
    try {
      return await this.memoryService.getUserProfile(userId);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Summarize conversation for handoff
   */
  private summarizeConversation(messages: ChatMessage[]): string {
    // Get last 5 user messages
    const userMessages = messages
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content);

    if (userMessages.length === 0) {
      return 'No previous conversation.';
    }

    return `Recent user requests:\n${userMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
  }

  /**
   * Infer user goal from conversation
   */
  private inferUserGoal(messages: ChatMessage[]): string {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .slice(-1)[0];

    return lastUserMessage?.content || 'Continue assisting the user';
  }

  /**
   * Get model for token limit
   */
  private getModelForTokenLimit(maxTokens: number): string {
    if (maxTokens <= 4096) return 'gpt-3.5-turbo';
    if (maxTokens <= 8192) return 'gpt-4';
    if (maxTokens <= 32000) return 'gpt-4-32k';
    return 'gpt-4-turbo-preview';
  }

  /**
   * Generate cache key
   */
  private getCacheKey(threadId: string, userId: string, agentId: string): string {
    return `${threadId}_${userId}_${agentId}`;
  }

  /**
   * Generate context hash for versioning
   */
  private generateContextHash(threadId: string, userId: string, agentId: string): string {
    const data = `${threadId}-${userId}-${agentId}-${Date.now()}`;
    return btoa(data).substring(0, 16);
  }

  /**
   * Increment context version
   */
  private incrementContextVersion(threadId: string): string {
    const current = this.contextVersions.get(threadId) || 0;
    const next = current + 1;
    this.contextVersions.set(threadId, next);
    return `v${next}`;
  }

  /**
   * Invalidate cache for a thread
   */
  private invalidateThreadCache(threadId: string): void {
    const keysToDelete: string[] = [];
    
    this.contextCache.forEach((_, key) => {
      if (key.startsWith(threadId)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.contextCache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for thread: ${threadId}`);
  }

  /**
   * Clear all context for a thread
   */
  async clearThreadContext(threadId: string): Promise<void> {
    this.invalidateThreadCache(threadId);
    this.documentManager.clearThreadContext(threadId);
    this.contextVersions.delete(threadId);
    console.log(`🗑️ Cleared all context for thread: ${threadId}`);
  }

  /**
   * Get context statistics
   */
  getContextStats(threadId: string): any {
    const entries = Array.from(this.contextCache.entries())
      .filter(([key]) => key.startsWith(threadId));

    if (entries.length === 0) {
      return { exists: false };
    }

    const context = entries[0][1];
    
    return {
      exists: true,
      version: context.contextVersion,
      age: Date.now() - context.lastUpdated.getTime(),
      messageCount: context.conversationHistory.length,
      documentCount: context.allDocuments.length,
      memoryCount: context.relevantMemories.length,
      tokenUsage: context.tokenStats.usagePercentage,
      lastUpdated: context.lastUpdated
    };
  }
}

