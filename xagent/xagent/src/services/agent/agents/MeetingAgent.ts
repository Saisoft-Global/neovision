import type { Meeting } from '../../../types/meeting';
import type { AgentConfig } from '../../../types/agent-framework';
import type { AgentResponse } from '../types';
import { BaseAgent } from '../BaseAgent';
import { generateMeetingMinutes } from '../../meeting/notes';
import { suggestMeetingTime } from '../../meeting/scheduler';

export class MeetingAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'schedule_meeting':
          return {
            success: true,
            data: await this.scheduleMeeting(params.meetingDetails as Partial<Meeting>)
          };
        case 'generate_minutes':
          return {
            success: true,
            data: await this.generateMinutes(params.meeting as Meeting)
          };
        case 'suggest_times':
          return {
            success: true,
            data: await this.suggestTimes(params.meeting as Partial<Meeting>)
          };
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async scheduleMeeting(meetingDetails: Partial<Meeting>) {
    const suggestedTimes = meetingDetails.startTime ? null : 
      await suggestMeetingTime(
        meetingDetails.attendees!,
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

    return {
      suggestedTimes,
      meeting: {
        ...meetingDetails,
        id: crypto.randomUUID(),
        status: 'scheduled'
      }
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
}