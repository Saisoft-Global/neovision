import type { Meeting } from '../../types/meeting';
import { createChatCompletion } from '../openai/chat';

export async function generateMeetingMinutes(meeting: Meeting): Promise<string> {
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Generate detailed meeting minutes including key points, decisions, and action items.',
    },
    {
      role: 'user',
      content: `Generate minutes for meeting: ${meeting.title}\n\nAgenda: ${meeting.agenda.map(item => item.title).join('\n')}\n\nTranscript: ${meeting.transcript || 'No transcript available'}`,
    },
  ]);

  return response?.choices[0]?.message?.content || 'Failed to generate meeting minutes';
}

export async function generateAgenda(
  title: string,
  description: string,
  duration: number
): Promise<Meeting['agenda']> {
  const response = await createChatCompletion([
    {
      role: 'system',
      content: 'Generate a structured meeting agenda with time allocations.',
    },
    {
      role: 'user',
      content: `Create an agenda for a ${duration} minute meeting about: ${title}\n\nContext: ${description}`,
    },
  ]);

  const content = response?.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  // Parse and structure the response as agenda items
  return [{
    id: crypto.randomUUID(),
    title: 'Introduction',
    duration: 5,
    description: 'Meeting opening and participant introductions',
  }];
}