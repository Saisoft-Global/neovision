import type { Meeting } from '../../types/meeting';
import { createClient } from '@supabase/supabase-js';
import { MeetingAgent } from '../agents/MeetingAgent';
import { AgentFactory } from '../agent/AgentFactory';
import { EmailService } from '../email/EmailService';

export class MeetingService {
  private static instance: MeetingService;
  private meetingAgent: MeetingAgent;
  private emailService: EmailService;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.emailService = EmailService.getInstance();
    this.initializeAgent();
  }

  public static getInstance(): MeetingService {
    if (!this.instance) {
      this.instance = new MeetingService();
    }
    return this.instance;
  }

  private async initializeAgent() {
    const factory = AgentFactory.getInstance();
    this.meetingAgent = await factory.getAgent('meeting') as MeetingAgent;
  }

  public async scheduleMeeting(meetingDetails: Partial<Meeting>) {
    // Schedule meeting
    const result = await this.meetingAgent.execute('schedule_meeting', { meetingDetails });

    // Store meeting in database
    await this.storeMeeting({
      ...meetingDetails,
      id: crypto.randomUUID(),
      status: 'scheduled',
    } as Meeting);

    return result;
  }

  public async generateMinutes(meeting: Meeting) {
    const result = await this.meetingAgent.execute('generate_minutes', { meeting });
    
    // Update meeting with minutes
    await this.updateMeeting(meeting.id, {
      minutes: result.minutes,
    });

    return result;
  }

  private async storeMeeting(meeting: Meeting) {
    const { error } = await this.supabase
      .from('meetings')
      .insert({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.startTime,
        end_time: meeting.endTime,
        attendees: meeting.attendees,
        status: meeting.status,
      });

    if (error) throw error;
  }

  private async updateMeeting(id: string, updates: Partial<Meeting>) {
    const { error } = await this.supabase
      .from('meetings')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }
}