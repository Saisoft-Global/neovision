import type { Agent } from '../../../types/agent';
import type { FeedbackEntry } from '../../../types/feedback';
import { createChatCompletion } from '../../openai/chat';

export class AgentAdapter {
  async adaptBehavior(agent: Agent, feedback: FeedbackEntry[]): Promise<Partial<Agent>> {
    const analysis = await this.analyzeFeedbackPatterns(feedback);
    return this.generateAdaptations(agent, analysis);
  }

  private async analyzeFeedbackPatterns(feedback: FeedbackEntry[]): Promise<any> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Analyze feedback patterns to suggest agent behavior improvements.',
      },
      {
        role: 'user',
        content: JSON.stringify(feedback),
      },
    ]);

    return JSON.parse(response?.choices[0]?.message?.content || '{}');
  }

  private async generateAdaptations(agent: Agent, analysis: any): Promise<Partial<Agent>> {
    const adaptations: Partial<Agent> = {};

    // Adjust personality traits based on feedback
    if (agent.personality && analysis.personalityAdjustments) {
      adaptations.personality = {
        ...agent.personality,
        ...analysis.personalityAdjustments,
      };
    }

    // Update expertise based on learning needs
    if (analysis.expertiseGaps) {
      adaptations.expertise = [
        ...agent.expertise,
        ...analysis.expertiseGaps,
      ];
    }

    return adaptations;
  }
}