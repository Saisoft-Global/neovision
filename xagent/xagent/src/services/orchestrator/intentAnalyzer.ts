import { createChatCompletion } from '../openai/chat';
import type { AgentType } from '../../types/agent';

interface IntentAnalysis {
  primaryIntent: string;
  requiredAgents: AgentType[];
  confidence: number;
  context: Record<string, unknown>;
}

export async function determineIntent(input: unknown): Promise<IntentAnalysis> {
  const prompt = buildIntentAnalysisPrompt(input);
  
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Analyze the input to determine the primary intent and required agents.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]);

  return parseIntentAnalysis(response?.choices[0]?.message?.content);
}

function buildIntentAnalysisPrompt(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  return JSON.stringify(input, null, 2);
}

function parseIntentAnalysis(response: string): IntentAnalysis {
  // Parse and validate the response
  const analysis = JSON.parse(response || '{}');
  
  return {
    primaryIntent: analysis.intent || 'unknown',
    requiredAgents: analysis.agents || [],
    confidence: analysis.confidence || 0,
    context: analysis.context || {},
  };
}