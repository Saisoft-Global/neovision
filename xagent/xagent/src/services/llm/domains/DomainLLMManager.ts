import { createChatCompletion } from '../providers/openai';
import type { ChatMessage, LLMConfig } from '../types';
import { domainConfigs } from './config';

export class DomainLLMManager {
  private static instance: DomainLLMManager;
  private domainModels: Map<string, LLMConfig>;

  private constructor() {
    this.domainModels = new Map(Object.entries(domainConfigs));
  }

  public static getInstance(): DomainLLMManager {
    if (!this.instance) {
      this.instance = new DomainLLMManager();
    }
    return this.instance;
  }

  async generateResponse(
    domain: string,
    messages: ChatMessage[],
    context?: Record<string, unknown>
  ): Promise<string> {
    const config = this.domainModels.get(domain);
    if (!config) {
      throw new Error(`No LLM configuration found for domain: ${domain}`);
    }

    const systemPrompt = this.getDomainSystemPrompt(domain, context);
    const augmentedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await createChatCompletion(
      augmentedMessages,
      config.model,
      config.temperature
    );

    return response?.choices[0]?.message?.content || '';
  }

  private getDomainSystemPrompt(domain: string, context?: Record<string, unknown>): string {
    const basePrompt = domainConfigs[domain]?.systemPrompt || '';
    if (!context) return basePrompt;

    return `${basePrompt}\n\nContext: ${JSON.stringify(context)}`;
  }
}