import type { Email } from '../../../types/email';
import type { Meeting } from '../../../types/meeting';
import { createChatCompletion } from '../../openai/chat';

export async function extractMeetingDetails(email: Email): Promise<Partial<Meeting> | null> {
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Extract meeting details from this email including date, time, attendees, and purpose.',
    },
    {
      role: 'user',
      content: `Subject: ${email.subject}\n\nContent: ${email.content}`,
    },
  ]);

  // Parse the response into meeting details
  // This is a simplified implementation
  const details = JSON.parse(response?.choices[0]?.message?.content || '{}');
  
  if (!details.title) return null;

  return {
    title: details.title,
    description: details.description,
    startTime: new Date(details.startTime),
    endTime: new Date(details.endTime),
    attendees: details.attendees || [],
  };
}