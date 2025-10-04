import type { AgentConfig } from '../../types/agent-framework';
import { createChatCompletion } from '../openai/chat';

export abstract class BaseAgent {
  protected id: string;
  protected config: AgentConfig;

  constructor(id: string, config: AgentConfig) {
    this.id = id;
    this.config = config;
  }

  protected async generateResponse(prompt: string, context: Record<string, unknown> = {}): Promise<string> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `${this.getSystemPrompt()}\n\nContext: ${JSON.stringify(context)}`,
      },
      { role: 'user', content: prompt },
    ]);

    return response?.choices[0]?.message?.content || '';
  }

  protected abstract getSystemPrompt(): string;
  abstract execute(action: string, params: Record<string, unknown>): Promise<unknown>;
}