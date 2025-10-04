import { createChatCompletion } from '../llm/providers/openai';
import { generateCompletion } from '../llm/providers/ollama';
import { useLLMConfigStore } from '../../store/llmConfigStore';
import { isServiceConfigured } from '../../config/environment';
import type { Message } from '../../types/agent';

export class MessageProcessor {
  private static instance: MessageProcessor;

  public static getInstance(): MessageProcessor {
    if (!this.instance) {
      this.instance = new MessageProcessor();
    }
    return this.instance;
  }

  async processMessage(message: string, context: any = {}): Promise<string> {
    const config = useLLMConfigStore.getState().config;

    try {
      if (config.provider === 'openai' && isServiceConfigured('openai')) {
        const response = await createChatCompletion([
          { 
            role: 'system', 
            content: this.getSystemPrompt(context.agentType) 
          },
          { role: 'user', content: message }
        ], config.model);
        return response.content;
      } else if (config.provider === 'ollama' && isServiceConfigured('ollama')) {
        const response = await generateCompletion([
          { role: 'user', content: message }
        ], config.model);
        return response.content;
      } else {
        throw new Error('No LLM provider configured');
      }
    } catch (error) {
      console.error('Message processing error:', error);
      throw error;
    }
  }

  private getSystemPrompt(agentType: string): string {
    const prompts: Record<string, string> = {
      hr: 'You are an HR assistant. Help with employee-related queries professionally.',
      finance: 'You are a finance expert. Provide accurate financial guidance.',
      knowledge: 'You are a knowledge base assistant. Help find and explain information.',
      default: 'You are a helpful AI assistant.',
    };

    return prompts[agentType] || prompts.default;
  }
}