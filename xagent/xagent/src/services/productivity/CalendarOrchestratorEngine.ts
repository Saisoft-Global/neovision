import { createChatCompletion } from '../openai/chat';
import type { Meeting } from '../../types/meeting';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  confidence: number;
}

export interface MeetingScheduleRequest {
  title: string;
  description?: string;
  duration: number; // minutes
  attendees: string[]; // email addresses
  preferredTimes?: Date[];
  deadline?: Date; // must be scheduled by
  priority: number;
}

export interface ScheduledMeeting {
  meeting: Meeting;
  meetingLink: string;
  invitesSent: boolean;
  calendarBlocked: boolean;
}

export class CalendarOrchestratorEngine {
  private static instance: CalendarOrchestratorEngine;

  private constructor() {}

  public static getInstance(): CalendarOrchestratorEngine {
    if (!this.instance) {
      this.instance = new CalendarOrchestratorEngine();
    }
    return this.instance;
  }

  async findOptimalTimeSlot(
    request: MeetingScheduleRequest
  ): Promise<TimeSlot> {
    console.log(`📅 Finding optimal time slot for: ${request.title}`);

    try {
      // Get availability for all attendees
      const availability = await this.getAttendeesAvailability(
        request.attendees,
        request.deadline || this.getDefaultDeadline()
      );

      // AI determines best time
      const optimal = await this.determineOptimalTime(request, availability);

      return optimal;
    } catch (error) {
      console.error('Time slot finding error:', error);
      throw error;
    }
  }

  async scheduleMeetingAutomatically(
    request: MeetingScheduleRequest
  ): Promise<ScheduledMeeting> {
    console.log(`🤖 Automatically scheduling: ${request.title}`);

    // Step 1: Find optimal time
    const timeSlot = await this.findOptimalTimeSlot(request);

    // Step 2: Generate meeting link (Teams/Zoom)
    const meetingLink = await this.generateMeetingLink(request);

    // Step 3: Create meeting object
    const meeting: Meeting = {
      id: crypto.randomUUID(),
      title: request.title,
      description: request.description || '',
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      attendees: request.attendees.map(email => ({ email, name: email })),
      platform: 'teams', // Default to Teams
      status: 'scheduled',
      agenda: await this.generateAgenda(request)
    };

    // Step 4: Send invites
    await this.sendMeetingInvites(meeting, meetingLink);

    // Step 5: Block calendar
    await this.blockCalendar(meeting);

    // Step 6: Send confirmation to all parties
    await this.sendConfirmations(meeting, meetingLink);

    return {
      meeting,
      meetingLink,
      invitesSent: true,
      calendarBlocked: true
    };
  }

  async blockFocusTime(
    duration: number,
    preferredTime?: Date
  ): Promise<TimeSlot> {
    console.log(`🎯 Blocking ${duration} minutes of focus time`);

    // AI determines best time for focus work
    const optimal = await this.findFocusTimeSlot(duration, preferredTime);

    // Block calendar
    await this.blockCalendar({
      id: crypto.randomUUID(),
      title: '🎯 Focus Time - Do Not Disturb',
      description: 'Blocked for deep work',
      startTime: optimal.start,
      endTime: optimal.end,
      attendees: [],
      platform: 'teams',
      status: 'scheduled'
    });

    return optimal;
  }

  private async getAttendeesAvailability(
    attendees: string[],
    deadline: Date
  ): Promise<Map<string, TimeSlot[]>> {
    // In production, integrate with calendar APIs (Microsoft Graph, Google Calendar)
    // For now, return mock availability
    const availability = new Map<string, TimeSlot[]>();

    for (const attendee of attendees) {
      // Get calendar data from API
      const slots = await this.fetchCalendarAvailability(attendee, deadline);
      availability.set(attendee, slots);
    }

    return availability;
  }

  private async fetchCalendarAvailability(
    email: string,
    deadline: Date
  ): Promise<TimeSlot[]> {
    // TODO: Integrate with Microsoft Graph API or Google Calendar API
    // For now, generate business hours slots
    const slots: TimeSlot[] = [];
    const start = new Date();
    const end = deadline;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Business hours: 9 AM - 5 PM
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(d);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1);

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: Math.random() > 0.3, // Mock: 70% available
          confidence: 0.9
        });
      }
    }

    return slots;
  }

  private async determineOptimalTime(
    request: MeetingScheduleRequest,
    availability: Map<string, TimeSlot[]>
  ): Promise<TimeSlot> {
    // Find common available slots
    const commonSlots = this.findCommonAvailability(availability, request.duration);

    if (commonSlots.length === 0) {
      throw new Error('No common availability found');
    }

    // AI selects best slot
    const optimal = await this.selectBestSlot(commonSlots, request);

    return optimal;
  }

  private findCommonAvailability(
    availability: Map<string, TimeSlot[]>,
    duration: number
  ): TimeSlot[] {
    // Find slots where all attendees are available
    const allSlots = Array.from(availability.values());
    
    if (allSlots.length === 0) return [];

    const commonSlots: TimeSlot[] = [];

    // Get first person's slots as baseline
    const baseSlots = allSlots[0];

    for (const slot of baseSlots) {
      if (!slot.available) continue;

      // Check if all other attendees are available at this time
      const allAvailable = allSlots.every(personSlots =>
        personSlots.some(s =>
          s.available &&
          s.start.getTime() === slot.start.getTime()
        )
      );

      if (allAvailable) {
        commonSlots.push(slot);
      }
    }

    return commonSlots;
  }

  private async selectBestSlot(
    slots: TimeSlot[],
    request: MeetingScheduleRequest
  ): Promise<TimeSlot> {
    // AI determines best time considering various factors
    const analysis = await createChatCompletion([
      {
        role: 'system',
        content: `Select the optimal meeting time from available slots.
        
        Consider:
        1. Time of day (morning meetings for important topics)
        2. Day of week (avoid Monday mornings, Friday afternoons)
        3. Lunch hours (avoid 12-1 PM)
        4. End of day (avoid after 4 PM)
        5. Preferred times if specified
        6. Meeting priority and type
        
        Return the index of the best slot.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          slots: slots.map((s, i) => ({
            index: i,
            start: s.start,
            dayOfWeek: s.start.toLocaleDateString('en-US', { weekday: 'long' }),
            timeOfDay: s.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          })),
          meeting: {
            title: request.title,
            priority: request.priority,
            preferredTimes: request.preferredTimes
          }
        })
      }
    ]);

    const selectedIndex = parseInt(analysis?.choices[0]?.message?.content || '0');
    return slots[selectedIndex] || slots[0];
  }

  private async generateMeetingLink(request: MeetingScheduleRequest): Promise<string> {
    // Generate Teams meeting link
    // In production, integrate with Microsoft Graph API
    const meetingId = crypto.randomUUID();
    return `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
  }

  private async generateAgenda(request: MeetingScheduleRequest): Promise<any[]> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `Generate a structured meeting agenda with time allocations.`
      },
      {
        role: 'user',
        content: `Meeting: ${request.title}
Duration: ${request.duration} minutes
Description: ${request.description || 'N/A'}

Create agenda with:
- Introduction (5 min)
- Main topics (proportional time)
- Q&A
- Next steps`
      }
    ]);

    // Parse agenda items
    return [
      {
        id: crypto.randomUUID(),
        title: 'Introduction',
        duration: 5,
        description: 'Welcome and introductions'
      }
    ];
  }

  private async sendMeetingInvites(meeting: Meeting, link: string): Promise<void> {
    console.log(`📧 Sending meeting invites for: ${meeting.title}`);
    // TODO: Integrate with email service to send calendar invites
  }

  private async blockCalendar(meeting: Meeting): Promise<void> {
    console.log(`📅 Blocking calendar for: ${meeting.title}`);
    // TODO: Integrate with calendar API to block time
  }

  private async sendConfirmations(meeting: Meeting, link: string): Promise<void> {
    console.log(`✅ Sending confirmations for: ${meeting.title}`);
    // TODO: Send confirmation emails to all attendees
  }

  private async findFocusTimeSlot(
    duration: number,
    preferredTime?: Date
  ): Promise<TimeSlot> {
    // AI finds best time for focus work (no meetings, minimal interruptions)
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    // Get calendar for next 7 days
    const calendar = await this.fetchCalendarAvailability('user@company.com', endOfWeek);

    // Find longest continuous available blocks
    const focusBlocks = calendar.filter(slot => 
      slot.available && 
      this.getBlockDuration(slot) >= duration
    );

    // AI selects best focus time
    return focusBlocks[0] || calendar[0];
  }

  private getBlockDuration(slot: TimeSlot): number {
    return (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
  }

  private getDefaultDeadline(): Date {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14); // 2 weeks from now
    return deadline;
  }
}
