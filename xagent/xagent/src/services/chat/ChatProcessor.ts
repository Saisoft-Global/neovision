import { LLMProviderManager } from '../llm/providers/LLMProviderManager';
import { getDomainPrompt } from './prompts/domainPrompts';
import { getAgentContext } from './context/agentContext';
import type { Agent } from '../../types/agent';
import type { ChatMessage } from '../llm/types';
import { Logger } from '../../utils/logging/Logger';
import { ErrorHandler } from '../../utils/errors/ErrorHandler';
import { KnowledgeAgent } from '../agents/KnowledgeAgent';
import { isServiceConfigured } from '../../config/environment';

export class ChatProcessor {
  private static instance: ChatProcessor;
  private llmManager: LLMProviderManager;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private knowledgeAgent: KnowledgeAgent;

  private constructor() {
    this.llmManager = LLMProviderManager.getInstance();
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.knowledgeAgent = new KnowledgeAgent('knowledge', {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    });
  }

  public static getInstance(): ChatProcessor {
    if (!this.instance) {
      this.instance = new ChatProcessor();
    }
    return this.instance;
  }

  async processMessage(message: string, agent: Agent): Promise<string> {
    try {
      if (!isServiceConfigured('openai')) {
        throw new Error('OpenAI API key not configured. Please check your environment variables.');
      }

      this.logger.info('Processing message', 'chat', {
        agentId: agent.id,
        agentType: agent.type,
      });

      // First, get relevant knowledge context
      let knowledgeContext = '';
      let vectorStoreStatus = '';
      
      try {
        const knowledgeResponse = await this.knowledgeAgent.execute('query_with_context', {
          query: message,
        }) as any;

        knowledgeContext = knowledgeResponse?.answer || '';
        
        if (!knowledgeResponse.hasVectorStore) {
          vectorStoreStatus = '\n\nNote: Vector store is currently disabled. Responses are based on general knowledge.';
        }
      } catch (error) {
        this.logger.warning('Failed to get knowledge context:', 'chat', { error });
        vectorStoreStatus = '\n\nNote: Unable to access knowledge base. Responses are based on general knowledge.';
      }

      // Build system prompt with knowledge context
      const systemPrompt = getDomainPrompt(agent.type);
      const agentContext = await getAgentContext(agent, message);
      const contextMessage = `Context:\n${JSON.stringify(agentContext)}\n\nKnowledge Base:\n${knowledgeContext}${vectorStoreStatus}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contextMessage },
        { role: 'user', content: message }
      ];

      // Generate response
      const response = await this.llmManager.generateResponse(
        messages,
        agent.type === 'technical' ? 'openai' : undefined,
        {
          temperature: this.getTemperatureForDomain(agent.type)
        }
      );

      this.logger.info('Message processed successfully', 'chat', {
        agentId: agent.id,
        agentType: agent.type,
      });

      return response.content;
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

  private getTemperatureForDomain(domain: string): number {
    const temperatures: Record<string, number> = {
      technical: 0.3,
      creative: 0.8,
      hr: 0.6,
      finance: 0.2,
      default: 0.7
    };
    return temperatures[domain] || temperatures.default;
  }
}