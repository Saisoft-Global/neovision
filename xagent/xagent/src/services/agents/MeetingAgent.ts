import type { Meeting } from '../../types/meeting';
import type { Email } from '../../types/email';
import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from '../agent/BaseAgent';
import { generateMeetingMinutes } from '../meeting/notes';
import { suggestMeetingTime } from '../meeting/scheduler';
import { getMeetingContext } from '../meeting/context';
import { generateMeetingInvitation } from '../email/templates/meetingTemplates';

export class MeetingAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'schedule_meeting':
        return this.scheduleMeeting(params.meetingDetails as Partial<Meeting>);
      case 'generate_minutes':
        return this.generateMinutes(params.meeting as Meeting);
      case 'suggest_times':
        return this.suggestTimes(params.meeting as Partial<Meeting>);
      case 'process_meeting_email':
        return this.processMeetingEmail(params.email as Email);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async scheduleMeeting(meetingDetails: Partial<Meeting>) {
    // Get suggested times if not provided
    const suggestedTimes = meetingDetails.startTime ? null : 
      await suggestMeetingTime(
        meetingDetails.attendees!,
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

    // Generate meeting invitation email
    const invitation = generateMeetingInvitation({
      ...meetingDetails,
      startTime: meetingDetails.startTime || suggestedTimes![0],
      endTime: meetingDetails.endTime || new Date(suggestedTimes![0].getTime() + 60 * 60 * 1000),
    } as Meeting);

    return {
      suggestedTimes,
      invitation,
    };
  }

  private async generateMinutes(meeting: Meeting) {
    const minutes = await generateMeetingMinutes(meeting);
    return { minutes };
  }

  private async suggestTimes(meeting: Partial<Meeting>) {
    const times = await suggestMeetingTime(
      meeting.attendees!,
      60,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    return { suggestedTimes: times };
  }

  private async processMeetingEmail(email: Email) {
    const context = await getMeetingContext(email);
    return { context };
  }
}