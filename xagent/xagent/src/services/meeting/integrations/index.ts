import type { Meeting } from '../../../types/meeting';

export interface MeetingPlatform {
  scheduleMeeting: (meeting: Meeting) => Promise<string>; // Returns meeting URL
  joinMeeting: (meetingId: string) => Promise<void>;
  endMeeting: (meetingId: string) => Promise<void>;
  getTranscript: (meetingId: string) => Promise<string>;
}

// Platform-specific implementations
import { TeamsIntegration } from './teams';
import { ZoomIntegration } from './zoom';

const platforms: Record<Meeting['platform'], MeetingPlatform> = {
  teams: new TeamsIntegration(),
  zoom: new ZoomIntegration(),
  meet: {
    // Google Meet implementation would go here
    scheduleMeeting: async () => '',
    joinMeeting: async () => {},
    endMeeting: async () => {},
    getTranscript: async () => '',
  },
};

export function getMeetingPlatform(platform: Meeting['platform']): MeetingPlatform {
  return platforms[platform];
}