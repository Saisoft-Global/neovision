import type { Meeting } from '../../../types/meeting';
import { format } from 'date-fns';

export function generateMeetingInvitation(meeting: Meeting): string {
  return `
Dear ${meeting.attendees.map(a => a.name).join(', ')},

You are invited to: ${meeting.title}

Date: ${format(meeting.startTime, 'PPP')}
Time: ${format(meeting.startTime, 'p')} - ${format(meeting.endTime, 'p')}

Agenda:
${meeting.agenda.map(item => `- ${item.title} (${item.duration} mins)`).join('\n')}

Please confirm your attendance.

Best regards,
AI Meeting Assistant
`;
}

export function generateMeetingMinutes(meeting: Meeting): string {
  return `
Meeting Minutes: ${meeting.title}
Date: ${format(meeting.startTime, 'PPP')}

Attendees:
${meeting.attendees.map(a => `- ${a.name}`).join('\n')}

Summary:
${meeting.summary}

Action Items:
${meeting.tasks?.map(task => `- ${task.title} (Assigned to: ${task.assignee})`).join('\n')}

Next Steps:
1. Review and confirm these minutes
2. Begin working on assigned tasks
3. Schedule follow-up meeting if needed
`;
}