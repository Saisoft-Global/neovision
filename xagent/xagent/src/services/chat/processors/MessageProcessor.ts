import type { ChatMessage } from '../../../types/messaging';
import { LLMOrchestrator } from '../../llm/LLMOrchestrator';
import { getSystemPrompt } from '../utils/prompts';

export class MessageProcessor {
  private llmOrchestrator: LLMOrchestrator;

  constructor() {
    this.llmOrchestrator = LLMOrchestrator.getInstance();
  }

  async processMessage(message: string, context: any = {}): Promise<string> {
    try {
      const messages = this.buildMessages(message, context);
      const response = await this.llmOrchestrator.getResponse(messages);
      return response.content;
    } catch (error) {
      console.error('Message processing error:', error);
      return this.getErrorMessage();
    }
  }

  private buildMessages(message: string, context: any): ChatMessage[] {
    return [
      { 
        role: 'system', 
        content: getSystemPrompt(context.agentType) 
      },
      { role: 'user', content: message }
    ];
  }

  private getErrorMessage(): string {
    return "I apologize, but all language models are currently unavailable. Please try again later.";
  }
}