import type { Email } from '../../../types/email';
import { createChatCompletion } from '../../openai/chat';

export type EmailIntent = 
  | 'schedule_meeting'
  | 'reschedule_meeting'
  | 'cancel_meeting'
  | 'meeting_minutes'
  | 'meeting_followup'
  | 'task_update'
  | 'general_query'
  | 'other';

export async function classifyEmailIntent(email: Email): Promise<EmailIntent> {
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Classify the intent of this email regarding meetings and tasks.',
    },
    {
      role: 'user',
      content: `Subject: ${email.subject}\n\nContent: ${email.content}`,
    },
  ]);

  // Parse and validate the response
  const intent = response?.choices[0]?.message?.content?.toLowerCase() as EmailIntent;
  return intent || 'other';
}