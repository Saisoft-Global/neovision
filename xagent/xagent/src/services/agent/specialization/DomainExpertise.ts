import type { Agent } from '../../../types/agent';
import { createChatCompletion } from '../../openai/chat';

export class DomainExpertise {
  async validateExpertise(agent: Agent, query: string): Promise<boolean> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Evaluate if this query matches the agent\'s expertise domains.',
      },
      {
        role: 'user',
        content: `Agent expertise: ${agent.expertise.join(', ')}\nQuery: ${query}`,
      },
    ]);

    return response?.choices[0]?.message?.content?.toLowerCase().includes('true') ?? false;
  }

  async enhanceResponse(response: string, agent: Agent): Promise<string> {
    // Add domain-specific enhancements to the response
    const enhancements = await this.getDomainEnhancements(response, agent.expertise);
    return this.incorporateEnhancements(response, enhancements);
  }

  private async getDomainEnhancements(response: string, expertise: string[]): Promise<string[]> {
    const enhancements = await Promise.all(expertise.map(async domain => {
      const enhancement = await createChatCompletion([
        {
          role: 'system',
          content: `Enhance this response with ${domain}-specific insights.`,
        },
        {
          role: 'user',
          content: response,
        },
      ]);
      return enhancement?.choices[0]?.message?.content || '';
    }));

    return enhancements.filter(Boolean);
  }

  private incorporateEnhancements(response: string, enhancements: string[]): string {
    if (!enhancements.length) return response;
    return `${response}\n\nAdditional Insights:\n${enhancements.join('\n')}`;
  }
}