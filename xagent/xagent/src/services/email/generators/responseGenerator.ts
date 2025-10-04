import type { Email } from '../../../types/email';
import type { EmailIntent } from '../analysis/intentClassifier';
import type { Meeting } from '../../../types/meeting';
import { createChatCompletion } from '../../openai/chat';

interface ResponseContext {
  relatedMeetings?: Meeting[];
  previousEmails?: Email[];
  tasks?: any[];
}

export async function generateResponse(
  email: Email,
  intent: EmailIntent,
  context: ResponseContext
): Promise<string> {
  const prompt = buildPromptForIntent(intent, email, context);
  
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Generate a professional and contextually appropriate email response.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]);

  return response?.choices[0]?.message?.content || '';
}

function buildPromptForIntent(
  intent: EmailIntent,
  email: Email,
  context: ResponseContext
): string {
  const contextInfo = [
    context.relatedMeetings?.length ? `Related meetings: ${context.relatedMeetings.map(m => m.title).join(', ')}` : '',
    context.tasks?.length ? `Pending tasks: ${context.tasks.map(t => t.title).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return `
Intent: ${intent}
Original Email: ${email.content}
Context:
${contextInfo}

Generate a response that:
1. Acknowledges the email
2. Addresses the specific intent
3. Includes relevant context
4. Provides clear next steps
`;
}