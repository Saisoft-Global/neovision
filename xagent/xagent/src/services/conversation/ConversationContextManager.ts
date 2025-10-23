import type { ChatMessage } from '../llm/types';
import { TokenManager } from './TokenManager';
import { MemoryService } from '../memory/MemoryService';
import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import { isServiceConfigured } from '../../config/environment';

interface ConversationContext {
  messages: ChatMessage[];
  relevantMemories: any[];
  tokenStats: {
    currentTokens: number;
    maxTokens: number;
    usagePercentage: number;
  };
}

export class ConversationContextManager {
  private static instance: ConversationContextManager;
  private tokenManager: TokenManager;
  private memoryService: MemoryService;

  private constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.memoryService = MemoryService.getInstance();
  }

  static getInstance(): ConversationContextManager {
    if (!this.instance) {
      this.instance = new ConversationContextManager();
    }
    return this.instance;
  }

  /**
   * Get conversation history for a thread
   */
  getConversationHistory(threadId: string): ChatMessage[] {
    try {
      const key = `chat_turns_${threadId}`;
      const stored = sessionStorage.getItem(key);
      
      if (!stored) {
        return [];
      }

      const turns = JSON.parse(stored);
      return turns.map((turn: any) => ({
        role: turn.role,
        content: turn.content
      }));
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Build complete context for a message including history and relevant memories
   */
  async buildMessageContext(
    threadId: string,
    currentMessage: string,
    userId: string,
    systemPrompt: string,
    model: string = 'gpt-4-turbo-preview'
  ): Promise<ConversationContext> {
    // 1. Get conversation history
    const history = this.getConversationHistory(threadId);

    // 2. Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: currentMessage }
    ];

    // 3. Get token statistics
    const tokenStats = this.tokenManager.getTokenStats(messages, model);
    console.log(`📊 Token usage: ${tokenStats.currentTokens}/${tokenStats.maxTokens} (${tokenStats.usagePercentage}%)`);

    // 4. Compress if needed
    let optimizedMessages = messages;
    if (tokenStats.shouldCompress) {
      console.log('🔄 Compressing conversation to fit token limit...');
      optimizedMessages = await this.tokenManager.prepareConversationContext(messages, model);
    }

    // 5. Search for relevant memories (semantic search)
    const relevantMemories = await this.searchRelevantMemories(currentMessage, userId, threadId);

    // 6. If we have relevant memories, add them to context
    if (relevantMemories.length > 0) {
      const memoryContext = this.buildMemoryContext(relevantMemories);
      
      // Insert memory context after system prompt
      optimizedMessages = [
        optimizedMessages[0], // system prompt
        { role: 'system', content: memoryContext },
        ...optimizedMessages.slice(1)
      ];

      // Re-check tokens after adding memories
      const newTokenCount = this.tokenManager.countMessagesTokens(optimizedMessages);
      if (newTokenCount > this.tokenManager.getModelLimit(model) - this.tokenManager['RESERVED_FOR_RESPONSE']) {
        console.warn('⚠️ Memories pushed over token limit, removing oldest memories...');
        // Remove memory context if it pushes us over
        optimizedMessages = [
          optimizedMessages[0],
          ...optimizedMessages.slice(2)
        ];
      }
    }

    return {
      messages: optimizedMessages,
      relevantMemories,
      tokenStats: {
        currentTokens: this.tokenManager.countMessagesTokens(optimizedMessages),
        maxTokens: this.tokenManager.getModelLimit(model),
        usagePercentage: tokenStats.usagePercentage
      }
    };
  }

  /**
   * Search for relevant memories using semantic search
   */
  private async searchRelevantMemories(
    query: string,
    userId: string,
    threadId: string
  ): Promise<any[]> {
    if (!isServiceConfigured('openai')) {
      return [];
    }

    try {
      // Search episodic memories
      const episodicMemories = await this.memoryService.searchMemories(query, userId, {
        type: 'episode',
        limit: 3
      });

      // Search general memories
      const generalMemories = await this.memoryService.searchMemories(query, userId, {
        limit: 2
      });

      // Get recent episodes from this thread
      const vectorStore = await getVectorStore();
      if (vectorStore) {
        const queryEmbedding = await generateEmbeddings(query);
        const threadMemories = await vectorStore.query({
          vector: queryEmbedding,
          topK: 3,
          filter: {
            userId,
            threadId,
            type: 'episode'
          },
          includeMetadata: true
        });

        const threadEpisodes = threadMemories.matches.map(m => ({
          content: m.metadata.summary,
          score: m.score,
          type: 'thread_episode'
        }));

        return [...threadEpisodes, ...episodicMemories, ...generalMemories]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5); // Top 5 most relevant
      }

      return [...episodicMemories, ...generalMemories].slice(0, 5);
    } catch (error) {
      console.error('Failed to search relevant memories:', error);
      return [];
    }
  }

  /**
   * Build memory context string from relevant memories
   */
  private buildMemoryContext(memories: any[]): string {
    if (memories.length === 0) {
      return '';
    }

    const memoryText = memories
      .map((memory, index) => {
        const content = typeof memory.content === 'string' 
          ? memory.content 
          : JSON.stringify(memory.content);
        return `[Memory ${index + 1}] ${content}`;
      })
      .join('\n\n');

    return `Relevant context from previous interactions:\n\n${memoryText}\n\nUse this context to provide more informed and personalized responses.`;
  }

  /**
   * Save conversation turn
   */
  saveConversationTurn(
    threadId: string,
    role: 'user' | 'assistant',
    content: string
  ): void {
    this.memoryService.recordChatTurn(threadId, {
      timestamp: new Date().toISOString(),
      role,
      content
    });
  }

  /**
   * Clear conversation history for a thread
   */
  clearConversationHistory(threadId: string): void {
    try {
      const key = `chat_turns_${threadId}`;
      sessionStorage.removeItem(key);
      console.log(`🗑️ Cleared conversation history for thread: ${threadId}`);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
    }
  }

  /**
   * Get conversation summary for a thread
   */
  async getConversationSummary(threadId: string): Promise<string> {
    const history = this.getConversationHistory(threadId);
    
    if (history.length === 0) {
      return 'No conversation history.';
    }

    return await this.tokenManager['summarizeMessages'](history);
  }

  /**
   * Check if conversation needs archiving (inactive or too long)
   */
  shouldArchiveConversation(threadId: string, maxAgeHours: number = 24): boolean {
    try {
      const key = `chat_turns_${threadId}`;
      const stored = sessionStorage.getItem(key);
      
      if (!stored) {
        return false;
      }

      const turns = JSON.parse(stored);
      if (turns.length === 0) {
        return false;
      }

      // Check last message timestamp
      const lastTurn = turns[turns.length - 1];
      const lastTimestamp = new Date(lastTurn.timestamp);
      const hoursSinceLastMessage = (Date.now() - lastTimestamp.getTime()) / (1000 * 60 * 60);

      return hoursSinceLastMessage >= maxAgeHours;
    } catch (error) {
      console.error('Failed to check archive status:', error);
      return false;
    }
  }
}
