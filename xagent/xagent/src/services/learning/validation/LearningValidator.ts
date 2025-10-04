import type { Agent } from '../../../types/agent';
import { createChatCompletion } from '../../openai/chat';

export class LearningValidator {
  async validateImprovement(
    agent: Agent,
    before: any,
    after: any
  ): Promise<{
    isValid: boolean;
    confidence: number;
    reasons?: string[];
  }> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: 'Validate if the proposed agent improvements are beneficial and safe.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            agent,
            before,
            after,
          }),
        },
      ]);

      const validation = JSON.parse(response?.choices[0]?.message?.content || '{}');

      return {
        isValid: validation.isValid ?? false,
        confidence: validation.confidence ?? 0,
        reasons: validation.reasons || [],
      };
    } catch (error) {
      console.error('Learning validation error:', error);
      return {
        isValid: false,
        confidence: 0,
        reasons: ['Validation failed due to technical error'],
      };
    }
  }
}