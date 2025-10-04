import { LLMProviderManager } from './providers/LLMProviderManager';
import type { ChatMessage, CompletionResponse, LLMProvider } from './types';

export class LLMOrchestrator {
  private static instance: LLMOrchestrator;
  private providerManager: LLMProviderManager;

  private constructor() {
    this.providerManager = LLMProviderManager.getInstance();
  }

  public static getInstance(): LLMOrchestrator {
    if (!this.instance) {
      this.instance = new LLMOrchestrator();
    }
    return this.instance;
  }

  async getResponse(
    messages: ChatMessage[],
    preferredProvider?: LLMProvider
  ): Promise<CompletionResponse> {
    try {
      return await this.providerManager.generateResponse(messages, preferredProvider);
    } catch (error) {
      console.error('LLM orchestration error:', error);
      throw new Error('Failed to generate response from any available LLM provider');
    }
  }

  getAvailableProviders(): LLMProvider[] {
    return this.providerManager.getAvailableProviders();
  }

  hasAvailableProviders(): boolean {
    return this.getAvailableProviders().length > 0;
  }
}