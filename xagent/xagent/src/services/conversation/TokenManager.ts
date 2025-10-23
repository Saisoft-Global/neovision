import { createChatCompletion } from '../openai/chat';
import type { ChatMessage } from '../llm/types';

interface TokenUsage {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
}

export class TokenManager {
  private static instance: TokenManager;
  
  // Token limits for different models
  private readonly MODEL_LIMITS: Record<string, number> = {
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5-turbo-16k': 16385,
    'llama-3.3-70b-versatile': 131072, // ✅ UPDATED: Oct 2024 - 128K context
    'llama-3.1-8b-instant': 131072, // ✅ UPDATED: Oct 2024 - 128K context
  };
  
  private readonly RESERVED_FOR_RESPONSE = 1000;
  private readonly KEEP_RECENT_MESSAGES = 5;
  private readonly SUMMARY_TRIGGER_RATIO = 0.7; // Summarize at 70% capacity

  private constructor() {}

  static getInstance(): TokenManager {
    if (!this.instance) {
      this.instance = new TokenManager();
    }
    return this.instance;
  }

  /**
   * Estimate token count (4 characters ≈ 1 token)
   * This is a rough estimation. For production, consider using tiktoken library
   */
  estimateTokens(text: string): number {
    // More accurate estimation considering:
    // - Average English word is ~4-5 characters
    // - Average token is ~0.75 words
    // - Special characters and formatting affect count
    
    // Remove extra whitespace
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Rough estimation: 4 characters per token
    const charCount = cleanText.length;
    const estimatedTokens = Math.ceil(charCount / 4);
    
    // Add overhead for message formatting (role, delimiters, etc.)
    return estimatedTokens + 10;
  }

  /**
   * Count tokens in a message array
   */
  countMessagesTokens(messages: ChatMessage[]): number {
    let total = 0;
    
    for (const message of messages) {
      // Count content tokens
      total += this.estimateTokens(message.content);
      
      // Add overhead for message structure (role, formatting)
      total += 4; // ~4 tokens per message for structure
    }
    
    return total;
  }

  /**
   * Get max tokens for a model
   */
  getModelLimit(model: string = 'gpt-4-turbo-preview'): number {
    return this.MODEL_LIMITS[model] || 8192;
  }

  /**
   * Check if messages fit within token limit
   */
  fitsWithinLimit(messages: ChatMessage[], model: string = 'gpt-4-turbo-preview'): boolean {
    const tokenCount = this.countMessagesTokens(messages);
    const limit = this.getModelLimit(model) - this.RESERVED_FOR_RESPONSE;
    return tokenCount <= limit;
  }

  /**
   * Prepare conversation context with intelligent compression
   */
  async prepareConversationContext(
    messages: ChatMessage[],
    model: string = 'gpt-4-turbo-preview'
  ): Promise<ChatMessage[]> {
    const maxTokens = this.getModelLimit(model) - this.RESERVED_FOR_RESPONSE;
    const currentTokens = this.countMessagesTokens(messages);

    console.log(`📊 Token usage: ${currentTokens}/${maxTokens} (${Math.round(currentTokens/maxTokens*100)}%)`);

    // If within limit, return as-is
    if (currentTokens <= maxTokens) {
      return messages;
    }

    console.log('🔄 Compressing conversation to fit token limit...');
    
    // Compress conversation
    return await this.compressConversation(messages, maxTokens);
  }

  /**
   * Compress conversation by summarizing older messages
   */
  private async compressConversation(
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<ChatMessage[]> {
    if (messages.length <= this.KEEP_RECENT_MESSAGES + 1) {
      // Too few messages to compress, just truncate
      return messages.slice(-this.KEEP_RECENT_MESSAGES);
    }

    // Separate system prompt, middle messages, and recent messages
    const systemPrompt = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    const recentMessages = conversationMessages.slice(-this.KEEP_RECENT_MESSAGES);
    const middleMessages = conversationMessages.slice(0, -this.KEEP_RECENT_MESSAGES);

    // If no middle messages, just return what we have
    if (middleMessages.length === 0) {
      return systemPrompt 
        ? [systemPrompt, ...recentMessages]
        : recentMessages;
    }

    // Summarize middle messages
    console.log(`📝 Summarizing ${middleMessages.length} older messages...`);
    const summary = await this.summarizeMessages(middleMessages);

    // Build compressed conversation
    const compressed: ChatMessage[] = [];
    
    if (systemPrompt) {
      compressed.push(systemPrompt);
    }
    
    // Add summary as system message
    compressed.push({
      role: 'system',
      content: `Previous conversation summary:\n${summary}`
    });
    
    // Add recent messages
    compressed.push(...recentMessages);

    // Check if still too large
    const compressedTokens = this.countMessagesTokens(compressed);
    if (compressedTokens > maxTokens) {
      console.warn('⚠️ Still exceeding token limit after compression, truncating further...');
      // Keep system + summary + fewer recent messages
      const keepRecent = Math.max(2, Math.floor(this.KEEP_RECENT_MESSAGES / 2));
      return [
        ...(systemPrompt ? [systemPrompt] : []),
        { role: 'system', content: `Previous conversation summary:\n${summary}` },
        ...recentMessages.slice(-keepRecent)
      ];
    }

    console.log(`✅ Compressed from ${messages.length} to ${compressed.length} messages`);
    return compressed;
  }

  /**
   * Summarize a set of messages
   */
  private async summarizeMessages(messages: ChatMessage[]): Promise<string> {
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Summarize this conversation concisely, preserving key information, decisions, and context. 
Keep the summary under 200 words but ensure all important details are retained.
Focus on:
- Main topics discussed
- Key information shared
- Decisions or conclusions reached
- Any important context for future messages`
        },
        {
          role: 'user',
          content: conversationText
        }
      ], 'gpt-3.5-turbo', 0.3); // Use cheaper model for summarization

      return response?.choices[0]?.message?.content || 'Previous conversation context.';
    } catch (error) {
      console.error('Failed to summarize messages:', error);
      // Fallback: simple truncation
      return messages
        .slice(-10)
        .map(m => `${m.role}: ${m.content.slice(0, 100)}...`)
        .join('\n');
    }
  }

  /**
   * Check if conversation should be summarized
   */
  shouldSummarize(messages: ChatMessage[], model: string = 'gpt-4-turbo-preview'): boolean {
    const currentTokens = this.countMessagesTokens(messages);
    const limit = this.getModelLimit(model) - this.RESERVED_FOR_RESPONSE;
    const ratio = currentTokens / limit;
    
    return ratio >= this.SUMMARY_TRIGGER_RATIO;
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(messages: ChatMessage[], model: string = 'gpt-4-turbo-preview'): {
    currentTokens: number;
    maxTokens: number;
    availableTokens: number;
    usagePercentage: number;
    shouldCompress: boolean;
  } {
    const currentTokens = this.countMessagesTokens(messages);
    const maxTokens = this.getModelLimit(model) - this.RESERVED_FOR_RESPONSE;
    const availableTokens = maxTokens - currentTokens;
    const usagePercentage = (currentTokens / maxTokens) * 100;
    const shouldCompress = usagePercentage >= (this.SUMMARY_TRIGGER_RATIO * 100);

    return {
      currentTokens,
      maxTokens,
      availableTokens,
      usagePercentage: Math.round(usagePercentage),
      shouldCompress
    };
  }

  /**
   * Optimize message array by removing redundant content
   */
  optimizeMessages(messages: ChatMessage[]): ChatMessage[] {
    // Remove duplicate consecutive messages
    const optimized: ChatMessage[] = [];
    let lastContent = '';

    for (const message of messages) {
      if (message.content !== lastContent) {
        optimized.push(message);
        lastContent = message.content;
      }
    }

    return optimized;
  }

  /**
   * Split long message into chunks if needed
   */
  splitLongMessage(content: string, maxTokens: number = 1000): string[] {
    const tokens = this.estimateTokens(content);
    
    if (tokens <= maxTokens) {
      return [content];
    }

    // Split by paragraphs first
    const paragraphs = content.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);
      const currentTokens = this.estimateTokens(currentChunk);

      if (currentTokens + paragraphTokens <= maxTokens) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
