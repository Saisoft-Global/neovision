import type { AgentRequest } from '../../types/agent';
import type { IntentAnalysis } from './intentAnalyzer';

export async function createWorkflow(
  intent: IntentAnalysis,
  input: unknown
): Promise<AgentRequest[]> {
  const workflow: AgentRequest[] = [];

  // Add knowledge retrieval step if needed
  if (needsContextEnrichment(intent)) {
    workflow.push({
      type: 'knowledge',
      action: 'retrieve_context',
      payload: { input, intent: intent.primaryIntent },
      priority: 1,
    });
  }

  // Add core action based on primary intent
  switch (intent.primaryIntent) {
    case 'schedule_meeting':
      workflow.push(
        {
          type: 'calendar',
          action: 'check_availability',
          payload: input,
          priority: 2,
        },
        {
          type: 'meeting',
          action: 'schedule',
          payload: input,
          priority: 3,
        },
        {
          type: 'email',
          action: 'send_invitation',
          payload: input,
          priority: 4,
        }
      );
      break;
    
    case 'process_email':
      workflow.push(
        {
          type: 'email',
          action: 'analyze',
          payload: input,
          priority: 2,
        },
        {
          type: 'task',
          action: 'extract_tasks',
          payload: input,
          priority: 3,
        }
      );
      break;
    
    // Add more intent handlers
  }

  return workflow;
}

function needsContextEnrichment(intent: IntentAnalysis): boolean {
  return intent.confidence < 0.8 || intent.requiredAgents.includes('knowledge');
}