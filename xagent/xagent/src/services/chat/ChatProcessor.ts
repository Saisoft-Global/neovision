import type { Agent } from '../../types/agent';
import { Logger } from '../../utils/logging/Logger';
import { ErrorHandler } from '../../utils/errors/ErrorHandler';
import { isServiceConfigured } from '../../config/environment';
import { OrchestratorAgent } from '../orchestrator/OrchestratorAgent';
import { MemoryService } from '../memory/MemoryService';
import { ConversationContextManager } from '../conversation/ConversationContextManager';
import { TokenManager } from '../conversation/TokenManager';

export class ChatProcessor {
  private static instance: ChatProcessor;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private orchestrator: OrchestratorAgent;
  private memory: MemoryService;
  private contextManager: ConversationContextManager;
  private tokenManager: TokenManager;

  private constructor() {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.orchestrator = OrchestratorAgent.getInstance();
    this.memory = MemoryService.getInstance();
    this.contextManager = ConversationContextManager.getInstance();
    this.tokenManager = TokenManager.getInstance();
  }

  public static getInstance(): ChatProcessor {
    if (!this.instance) {
      this.instance = new ChatProcessor();
    }
    return this.instance;
  }

  async processMessage(message: string, agent: Agent, userId?: string): Promise<string> {
    try {
      if (!isServiceConfigured('openai')) {
        throw new Error('OpenAI API key not configured. Please check your environment variables.');
      }

      const threadId = agent.id || 'default_thread';
      const effectiveUserId = userId || 'anonymous';

      this.logger.info('Processing message with conversation context', 'chat', {
        agentId: agent.id,
        agentType: agent.type,
        threadId,
        userId: effectiveUserId
      });

      // Build system prompt based on agent type
      const systemPrompt = this.buildSystemPrompt(agent);

      // Build complete conversation context with token management
      const context = await this.contextManager.buildMessageContext(
        threadId,
        message,
        effectiveUserId,
        systemPrompt,
        'gpt-4-turbo-preview'
      );

      this.logger.info('Conversation context built', 'chat', {
        messageCount: context.messages.length,
        tokenUsage: context.tokenStats.usagePercentage,
        relevantMemories: context.relevantMemories.length
      });

      // Log token statistics
      console.log(`📊 Token Stats:`, context.tokenStats);
      console.log(`🧠 Relevant Memories: ${context.relevantMemories.length}`);

      // Route the request through the Orchestrator with full context
      // ✨ NOW INCLUDING userId and context for RAG!
      const orchestratorResponse = await this.orchestrator.processRequest({ 
        message, 
        agent,
        userId: effectiveUserId,  // ← PASS userId for RAG
        conversationHistory: context.messages,
        relevantMemories: context.relevantMemories,
        tokenStats: context.tokenStats,
        context: {                // ← PASS full context for RAG
          documentContext: context.documentContext,
          sharedContext: context.sharedContext
        }
      });

      this.logger.info('Message processed successfully via orchestrator', 'chat', {
        agentId: agent.id,
        agentType: agent.type,
      });

      if (!orchestratorResponse?.success) {
        throw new Error(orchestratorResponse?.error || 'Failed to process message');
      }

      const data = orchestratorResponse.data as any;
      // Try common fields first, then fall back to stringifying the result
      const answer = (
        data?.message ||
        data?.answer ||
        (typeof data === 'string' ? data : JSON.stringify(data))
      );

      // Record conversation turns
      this.contextManager.saveConversationTurn(threadId, 'user', message);
      this.contextManager.saveConversationTurn(threadId, 'assistant', answer);

      // Check if conversation should be archived
      if (this.contextManager.shouldArchiveConversation(threadId, 24)) {
        console.log(`📦 Conversation ${threadId} is ready for archiving`);
        // Note: Actual archiving happens via scheduled task
      }
      
      return answer;
    } catch (error) {
      this.logger.error('Message processing error', 'chat', {
        agentId: agent.id,
        agentType: agent.type,
        error,
      });

      this.errorHandler.handleError(error, 'chat_processing');

      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('An unexpected error occurred while processing your message');
      }
    }
  }

  /**
   * Build system prompt based on agent type and personality
   */
  private buildSystemPrompt(agent: Agent): string {
    const basePrompts: Record<string, string> = {
      hr: 'You are an HR assistant. Help with employee-related queries professionally and empathetically.',
      finance: 'You are a finance expert. Provide accurate financial guidance and analysis.',
      knowledge: 'You are a knowledge base assistant. Help find and explain information clearly.',
      task: 'You are a task management assistant. Help organize and prioritize tasks effectively.',
      email: 'You are an email assistant. Help manage and respond to emails professionally.',
      meeting: 'You are a meeting coordinator. Help schedule and organize meetings efficiently.',
      productivity: 'You are a productivity assistant. Help optimize time, tasks, and communications.',
      crm: 'You are a CRM assistant. Help manage customer relationships and sales processes.',
      automation: 'You are an automation specialist. Help automate repetitive tasks and workflows.',
      default: 'You are a helpful AI assistant. Provide accurate, relevant, and thoughtful responses.'
    };

    const basePrompt = basePrompts[agent.type] || basePrompts.default;

    // Add personality traits if available
    if (agent.personality) {
      const personalityDesc = `

Your communication style:
- Friendliness: ${Math.round((agent.personality.friendliness || 0.7) * 100)}%
- Formality: ${Math.round((agent.personality.formality || 0.5) * 100)}%
- Proactiveness: ${Math.round((agent.personality.proactiveness || 0.6) * 100)}%
- Detail Orientation: ${Math.round((agent.personality.detail_orientation || 0.7) * 100)}%

Adjust your tone and responses accordingly.`;
      
      return basePrompt + personalityDesc;
    }

    return basePrompt;
  }

  /**
   * Get conversation statistics for a thread
   */
  getConversationStats(threadId: string): {
    messageCount: number;
    tokenUsage: number;
    shouldArchive: boolean;
  } {
    const history = this.contextManager.getConversationHistory(threadId);
    const tokenUsage = this.tokenManager.countMessagesTokens(history);
    const shouldArchive = this.contextManager.shouldArchiveConversation(threadId);

    return {
      messageCount: history.length,
      tokenUsage,
      shouldArchive
    };
  }
}