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

  getConfidenceScore(agent: Agent, domain: string): number {
    const expertise = agent.expertise.find(e => e.toLowerCase() === domain.toLowerCase());
    if (!expertise) return 0;

    // Calculate confidence based on agent's personality traits
    let confidence = 0.5; // Base confidence

    if (agent.personality) {
      confidence += agent.personality.detail_orientation * 0.3;
      confidence += agent.personality.proactiveness * 0.2;
    }

    return Math.min(confidence, 1);
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