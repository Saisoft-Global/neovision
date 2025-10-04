import { createChatCompletion } from '../../openai/chat';
import type { WorkflowCondition } from '../../../types/workflow';

export class ConditionEvaluator {
  async evaluate(
    conditions: WorkflowCondition[],
    context: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Use LLM to evaluate complex conditions
      const response = await createChatCompletion([
        {
          role: 'system',
          content: 'Evaluate the following conditions based on the provided context. Return true or false.',
        },
        {
          role: 'user',
          content: `Conditions: ${JSON.stringify(conditions)}\nContext: ${JSON.stringify(context)}`,
        },
      ]);

      return response?.choices[0]?.message?.content?.toLowerCase().includes('true') ?? false;
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  evaluateSimpleCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    try {
      // Create safe evaluation context
      const evalContext = {
        ...context,
        // Add helper functions
        equals: (a: any, b: any) => a === b,
        contains: (a: any[], b: any) => a.includes(b),
        greaterThan: (a: number, b: number) => a > b,
        lessThan: (a: number, b: number) => a < b,
      };

      // Convert condition string to function
      const fn = new Function(
        ...Object.keys(evalContext),
        `return ${condition};`
      );

      return fn(...Object.values(evalContext));
    } catch (error) {
      console.error('Simple condition evaluation error:', error);
      return false;
    }
  }
}