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
  
  const systemPrompt = `Analyze the input to determine the primary intent and required agents.

Available agent types:
- knowledge: For searching and managing information
- email: For email-related tasks
- meeting: For meeting management
- task: For general task management
- desktop_automation: For desktop and browser automation tasks
- crm_email: For CRM-related email processing and API integration

Return your analysis in this JSON format:
{
  "intent": "primary_intent_description",
  "agents": ["agent_type1", "agent_type2"],
  "confidence": 0.8,
  "context": {"key": "value"}
}

Examples:
- "Open Excel and create a report" → {"intent": "desktop_automation", "agents": ["desktop_automation"], "confidence": 0.9}
- "Search for information about AI" → {"intent": "knowledge_search", "agents": ["knowledge"], "confidence": 0.8}
- "Send an email to John" → {"intent": "email_communication", "agents": ["email"], "confidence": 0.9}
- "Login to website and fill form" → {"intent": "web_automation", "agents": ["desktop_automation"], "confidence": 0.9}
- "Process this email for CRM leads" → {"intent": "crm_email_processing", "agents": ["crm_email"], "confidence": 0.9}
- "Create a lead from this email" → {"intent": "crm_lead_creation", "agents": ["crm_email"], "confidence": 0.9}`;

  const response = await createChatCompletion([
    {
      role: 'system',
      content: systemPrompt,
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
  let analysis;
  try {
    analysis = JSON.parse(response || '{}');
  } catch (error) {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        // Try to extract JSON from the response text
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonText = response.substring(jsonStart, jsonEnd);
          analysis = JSON.parse(jsonText);
        } else {
          throw new Error('No valid JSON found');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse intent analysis:', response);
      analysis = {};
    }
  }
  
  return {
    primaryIntent: analysis.intent || 'unknown',
    requiredAgents: analysis.agents || [],
    confidence: analysis.confidence || 0,
    context: analysis.context || {},
  };
}