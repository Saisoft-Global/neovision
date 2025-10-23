import { createChatCompletion } from '../openai/chat';
import type { Email } from '../../types/email';
import { CalendarOrchestratorEngine } from './CalendarOrchestratorEngine';

export interface OutreachOpportunity {
  id: string;
  type: 'follow_up' | 'check_in' | 'reminder' | 'update' | 'thank_you';
  recipient: {
    email: string;
    name: string;
  };
  reason: string;
  suggestedMessage: string;
  priority: number;
  confidence: number;
  suggestedTiming: Date;
  context: any;
}

export interface ClientInteraction {
  clientEmail: string;
  lastContact: Date;
  interactionType: string;
  sentiment: string;
  openItems: string[];
}

export class ProactiveOutreachEngine {
  private static instance: ProactiveOutreachEngine;
  private calendarOrchestrator: CalendarOrchestratorEngine;

  private constructor() {
    this.calendarOrchestrator = CalendarOrchestratorEngine.getInstance();
  }

  public static getInstance(): ProactiveOutreachEngine {
    if (!this.instance) {
      this.instance = new ProactiveOutreachEngine();
    }
    return this.instance;
  }

  async identifyOutreachOpportunities(
    emails: Email[],
    interactions: ClientInteraction[]
  ): Promise<OutreachOpportunity[]> {
    console.log(`🔍 Identifying outreach opportunities from ${emails.length} emails`);

    // AI analyzes communication patterns
    const opportunities = await createChatCompletion([
      {
        role: 'system',
        content: `You are a relationship management expert. Identify proactive outreach opportunities.
        
        Analyze for:
        1. Clients who haven't been contacted recently (> 2 weeks)
        2. Follow-ups needed on previous conversations
        3. Thank you notes for positive interactions
        4. Check-ins for at-risk relationships
        5. Updates on pending matters
        6. Reminders for commitments made
        
        For each opportunity, provide:
        - Type of outreach
        - Recipient
        - Reason/context
        - Suggested message
        - Priority (1-10)
        - Confidence (0-1)
        - Best timing
        
        Return JSON array of opportunities.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          recentEmails: emails.slice(-50).map(e => ({
            from: e.from,
            subject: e.subject,
            date: e.timestamp
          })),
          clientInteractions: interactions
        })
      }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const opportunitiesText = response?.choices[0]?.message?.content || '{"opportunities": []}';
    const parsed = JSON.parse(opportunitiesText);

    return (parsed.opportunities || []).map((opp: any) => ({
      id: crypto.randomUUID(),
      type: opp.type,
      recipient: opp.recipient,
      reason: opp.reason,
      suggestedMessage: opp.suggestedMessage,
      priority: opp.priority || 5,
      confidence: opp.confidence || 0.7,
      suggestedTiming: new Date(opp.suggestedTiming || Date.now()),
      context: opp.context
    }));
  }

  async scheduleClientMeeting(
    clientEmail: string,
    purpose: string,
    context?: any
  ): Promise<any> {
    console.log(`📅 Scheduling meeting with ${clientEmail}`);

    // Step 1: Draft meeting request email
    const meetingRequest = await this.draftMeetingRequest(clientEmail, purpose, context);

    // Step 2: Find optimal time
    const timeSlot = await this.calendarOrchestrator.findOptimalTimeSlot({
      title: `Meeting with ${clientEmail}`,
      description: purpose,
      duration: 30, // Default 30 min
      attendees: [clientEmail],
      priority: 7
    });

    // Step 3: Generate meeting link
    const meetingLink = await this.generateMeetingLink();

    // Step 4: Send meeting request
    const sent = await this.sendMeetingRequest({
      to: clientEmail,
      subject: `Meeting Request: ${purpose}`,
      body: meetingRequest,
      proposedTime: timeSlot.start,
      duration: 30,
      meetingLink
    });

    return {
      sent,
      timeSlot,
      meetingLink,
      requestEmail: meetingRequest
    };
  }

  private async draftMeetingRequest(
    clientEmail: string,
    purpose: string,
    context?: any
  ): Promise<string> {
    const draft = await createChatCompletion([
      {
        role: 'system',
        content: `Draft a professional meeting request email.
        
        Style:
        - Professional but friendly
        - Clear purpose
        - Flexible on timing
        - Easy to accept
        
        Include:
        - Greeting
        - Purpose of meeting
        - Proposed time (with flexibility)
        - Meeting link
        - Agenda outline
        - Closing`
      },
      {
        role: 'user',
        content: `Draft meeting request to: ${clientEmail}
Purpose: ${purpose}
Context: ${JSON.stringify(context || {})}`
      }
    ]);

    return draft?.choices[0]?.message?.content || '';
  }

  private async generateMeetingLink(): Promise<string> {
    // Generate Teams meeting link
    const meetingId = crypto.randomUUID();
    return `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
  }

  private async sendMeetingRequest(request: any): Promise<boolean> {
    console.log(`📧 Sending meeting request to ${request.to}`);
    // TODO: Integrate with email sending service
    return true;
  }

  async generateFollowUpEmail(
    originalEmail: Email,
    daysSinceLastContact: number
  ): Promise<string> {
    const followUp = await createChatCompletion([
      {
        role: 'system',
        content: `Generate a professional follow-up email.
        
        Tone:
        - Polite and non-pushy
        - Reference previous conversation
        - Provide value
        - Clear call-to-action
        
        Avoid:
        - Being too aggressive
        - Sounding desperate
        - Generic templates`
      },
      {
        role: 'user',
        content: `Original email:
From: ${originalEmail.from.name}
Subject: ${originalEmail.subject}
Date: ${originalEmail.timestamp}
Content: ${originalEmail.content}

Days since last contact: ${daysSinceLastContact}

Generate appropriate follow-up.`
      }
    ]);

    return followUp?.choices[0]?.message?.content || '';
  }

  async sendProactiveUpdate(
    recipient: string,
    updates: string[]
  ): Promise<void> {
    console.log(`📢 Sending proactive update to ${recipient}`);

    const updateEmail = await this.draftUpdateEmail(recipient, updates);

    // Send email
    await this.sendEmail(recipient, 'Project Update', updateEmail);
  }

  private async draftUpdateEmail(
    recipient: string,
    updates: string[]
  ): Promise<string> {
    const draft = await createChatCompletion([
      {
        role: 'system',
        content: `Draft a proactive update email.
        
        Style:
        - Professional
        - Concise
        - Highlight key points
        - Show progress
        - Build confidence`
      },
      {
        role: 'user',
        content: `Recipient: ${recipient}
Updates: ${updates.join(', ')}

Draft update email.`
      }
    ]);

    return draft?.choices[0]?.message?.content || '';
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    // TODO: Integrate with email sending service
  }
}
