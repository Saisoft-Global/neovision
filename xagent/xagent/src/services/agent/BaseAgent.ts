import type { AgentConfig } from '../../types/agent-framework';
import type { AgentContext, AgentResponse } from './types';
import { createChatCompletion } from '../openai/chat';

export abstract class BaseAgent {
  protected id: string;
  protected config: AgentConfig;

  constructor(id: string, config: AgentConfig) {
    this.id = id;
    this.config = config;
  }

  protected async generateResponse(
    prompt: string,
    context: AgentContext
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ], this.config.llm_config);

    return response?.choices[0]?.message?.content || '';
  }

  private buildSystemPrompt(context: AgentContext): string {
    const { personality } = this.config;
    
    return `You are an AI assistant specializing in ${context.type} with expertise in: ${context.expertise.join(', ')}.

Personality traits:
- Friendliness: ${personality.friendliness * 100}%
- Formality: ${personality.formality * 100}%
- Proactiveness: ${personality.proactiveness * 100}%
- Detail orientation: ${personality.detail_orientation * 100}%

Adjust your communication style accordingly.`;
  }

  abstract execute(action: string, params: Record<string, unknown>): Promise<AgentResponse>;
}