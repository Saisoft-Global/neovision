import type { KnowledgeUpdate } from '../../../types/knowledge';
import { createChatCompletion } from '../../openai/chat';

export class UpdateValidator {
  async validateUpdate(update: KnowledgeUpdate): Promise<{
    isValid: boolean;
    confidence: number;
    reason?: string;
  }> {
    // Validate update content using LLM
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Validate the following knowledge update for accuracy and relevance.',
      },
      {
        role: 'user',
        content: JSON.stringify(update),
      },
    ]);

    const validation = JSON.parse(response?.choices[0]?.message?.content || '{}');

    return {
      isValid: validation.isValid ?? false,
      confidence: validation.confidence ?? 0,
      reason: validation.reason,
    };
  }

  async detectConflicts(update: KnowledgeUpdate, existingKnowledge: any): Promise<{
    hasConflicts: boolean;
    conflicts?: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    // Compare update with existing knowledge for conflicts
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Analyze the following update for conflicts with existing knowledge.',
      },
      {
        role: 'user',
        content: `Update: ${JSON.stringify(update)}\nExisting: ${JSON.stringify(existingKnowledge)}`,
      },
    ]);

    const analysis = JSON.parse(response?.choices[0]?.message?.content || '{}');

    return {
      hasConflicts: analysis.hasConflicts ?? false,
      conflicts: analysis.conflicts || [],
    };
  }
}