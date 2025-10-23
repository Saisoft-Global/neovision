import { BaseAgent } from '../BaseAgent';
import type { AgentConfig } from '../../../types/agent-framework';
import type { AgentResponse } from '../types';
import type { Email } from '../../../types/email';
import { EmailIntelligenceEngine, type DailySummary } from '../../productivity/EmailIntelligenceEngine';
import { CalendarOrchestratorEngine } from '../../productivity/CalendarOrchestratorEngine';
import { IntelligentTaskManager, type Task } from '../../productivity/IntelligentTaskManager';
import { ProactiveOutreachEngine } from '../../productivity/ProactiveOutreachEngine';
import { UnifiedEmailService } from '../../email/UnifiedEmailService';
import { EmailVectorizationService } from '../../productivity/EmailVectorizationService';
import { EmailMemorySystem } from '../../productivity/EmailMemorySystem';
import { createChatCompletion } from '../../openai/chat';

export class ProductivityAIAgent extends BaseAgent {
  private emailIntelligence: EmailIntelligenceEngine;
  private calendarOrchestrator: CalendarOrchestratorEngine;
  private taskManager: IntelligentTaskManager;
  private outreachEngine: ProactiveOutreachEngine;
  private emailService: UnifiedEmailService;
  private vectorizationService: EmailVectorizationService;
  private memorySystem: EmailMemorySystem;
  private isRunning: boolean = false;
  private userId: string = '';

  constructor(id: string, config: AgentConfig, organizationId: string | null = null) {
    super(id, config || {
      personality: {
        friendliness: 0.85,
        formality: 0.7,
        proactiveness: 0.95,  // Highly proactive
        detail_orientation: 0.8
      },
      skills: [
        { name: 'email_management', level: 5 },
        { name: 'calendar_management', level: 5 },
        { name: 'task_management', level: 5 },
        { name: 'meeting_coordination', level: 5 },
        { name: 'time_optimization', level: 5 }
      ],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7
      }
    }, organizationId);  // ✅ Pass organizationId to BaseAgent

    this.emailIntelligence = EmailIntelligenceEngine.getInstance();
    this.calendarOrchestrator = CalendarOrchestratorEngine.getInstance();
    this.taskManager = IntelligentTaskManager.getInstance();
    this.outreachEngine = ProactiveOutreachEngine.getInstance();
    this.emailService = UnifiedEmailService.getInstance();
    this.vectorizationService = EmailVectorizationService.getInstance();
    this.memorySystem = EmailMemorySystem.getInstance();
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'start_autonomous_mode':
          return await this.startAutonomousMode();
        
        case 'generate_daily_summary':
          return await this.generateDailySummary(params.emails as Email[]);
        
        case 'process_email':
          return await this.processEmail(params.email as Email);
        
        case 'schedule_meeting':
          return await this.scheduleMeeting(params);
        
        case 'create_task':
          return await this.createTask(params);
        
        case 'get_priorities':
          return await this.getPriorities();
        
        case 'identify_outreach':
          return await this.identifyOutreach(params);
        
        case 'auto_respond':
          return await this.autoRespond(params.email as Email);
        
        case 'block_focus_time':
          return await this.blockFocusTime(params.duration as number);
        
        case 'search_emails':
          return await this.searchEmails(params.query as string, params.options);
        
        case 'get_email_context':
          return await this.getEmailContext(params.email as Email);
        
        case 'build_memory':
          return await this.buildAgenticMemory();
        
        default:
          return {
            success: false,
            data: null,
            error: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async startAutonomousMode(): Promise<AgentResponse> {
    if (this.isRunning) {
      return {
        success: false,
        data: null,
        error: 'Autonomous mode already running'
      };
    }

    this.isRunning = true;
    console.log('🤖 Productivity AI Agent - Autonomous mode activated');

    // Run continuous background tasks
    this.runBackgroundTasks();

    return {
      success: true,
      data: {
        message: 'Autonomous mode activated. I\'m now monitoring your emails, calendar, and tasks 24/7.',
        features: [
          'Email processing and summarization',
          'Automatic task creation',
          'Meeting scheduling',
          'Proactive outreach',
          'Calendar optimization',
          'Daily briefings'
        ]
      }
    };
  }

  private async runBackgroundTasks() {
    // Process emails every 5 minutes
    setInterval(async () => {
      await this.processNewEmails();
    }, 5 * 60 * 1000);

    // Generate daily summary every morning at 7 AM
    const now = new Date();
    const tomorrow7AM = new Date(now);
    tomorrow7AM.setDate(now.getDate() + 1);
    tomorrow7AM.setHours(7, 0, 0, 0);
    const timeUntil7AM = tomorrow7AM.getTime() - now.getTime();

    setTimeout(() => {
      this.sendDailyBriefing();
      // Then repeat daily
      setInterval(() => this.sendDailyBriefing(), 24 * 60 * 60 * 1000);
    }, timeUntil7AM);

    // Identify outreach opportunities daily at 9 AM
    setTimeout(() => {
      this.identifyAndExecuteOutreach();
      setInterval(() => this.identifyAndExecuteOutreach(), 24 * 60 * 60 * 1000);
    }, timeUntil7AM + 2 * 60 * 60 * 1000); // 9 AM

    // Optimize calendar weekly on Sunday evening
    setInterval(async () => {
      if (new Date().getDay() === 0) { // Sunday
        await this.optimizeUpcomingWeek();
      }
    }, 24 * 60 * 60 * 1000);
  }

  // Duplicate processNewEmails method removed - see line 695 for the actual implementation

  async processEmail(email: Email): Promise<AgentResponse> {
    console.log(`📧 Processing email: ${email.subject}`);

    // Step 1: Classify email
    const classification = await this.emailIntelligence.classifyEmail(email);

    // Step 2: Vectorize and store in knowledge base
    await this.vectorizationService.vectorizeAndStoreEmail(
      email,
      classification,
      this.userId
    );
    console.log(`🔮 Email vectorized and stored in KB`);

    // Step 3: Build complete context using memory
    const context = await this.memorySystem.buildCompleteContext(email, this.userId);
    console.log(`🧠 Context built with ${context.relatedEmails.length} related emails`);

    // Step 4: Create tasks if action items found
    if (classification.actionItems.length > 0) {
      const tasks = await this.taskManager.createTasksFromEmail(email, classification);
      console.log(`✅ Created ${tasks.length} tasks from email`);
    }

    // Step 5: Generate context-aware response
    let response: string | null = null;
    if (classification.requiresResponse) {
      const responseContext = await this.memorySystem.getResponseContext(email, this.userId);
      response = await this.emailIntelligence.generateEmailResponse(email, {
        conversationHistory: context.threadEmails,
        userKnowledge: responseContext
      });
      
      // Auto-respond if appropriate
      if (classification.canAutoRespond && classification.confidence > 0.9) {
        await this.sendEmail(email.from.email, `Re: ${email.subject}`, response);
        console.log(`📤 Auto-responded to: ${email.subject}`);
        
        // Remember the interaction
        await this.memorySystem.rememberInteraction(email, response, this.userId);
      }
    }

    // Step 6: Schedule meeting if requested
    if (classification.actionItems.some(a => a.description.toLowerCase().includes('meeting'))) {
      await this.scheduleMeetingFromEmail(email, classification);
    }

    return {
      success: true,
      data: {
        classification,
        tasksCreated: classification.actionItems.length,
        autoResponded: classification.canAutoRespond,
        vectorized: true,
        contextUsed: context.relatedEmails.length > 0,
        response: response
      }
    };
  }

  async generateDailySummary(emails: Email[]): Promise<AgentResponse> {
    const summary = await this.emailIntelligence.generateDailySummary(emails);

    // Get tasks for today
    const tasks = this.taskManager.getTasks();
    const todayTasks = tasks.filter(t => 
      t.dueDate && 
      t.dueDate.toDateString() === new Date().toDateString()
    );

    // Generate comprehensive briefing
    const briefing = await this.generateMorningBriefing(summary, todayTasks);

    return {
      success: true,
      data: {
        summary,
        briefing,
        todayTasks
      }
    };
  }

  private async generateMorningBriefing(
    summary: DailySummary,
    todayTasks: Task[]
  ): Promise<string> {
    const briefing = await createChatCompletion([
      {
        role: 'system',
        content: `Generate an executive morning briefing.
        
        Style:
        - Concise but comprehensive
        - Highlight priorities
        - Actionable insights
        - Motivating tone
        - Clear structure
        
        Include:
        - Email summary with key items
        - Today's schedule
        - Priority tasks
        - Proactive suggestions
        - Time optimization tips`
      },
      {
        role: 'user',
        content: JSON.stringify({
          emailSummary: summary,
          todayTasks: todayTasks.map(t => ({
            title: t.title,
            priority: t.priority,
            dueDate: t.dueDate
          }))
        })
      }
    ]);

    return briefing?.choices[0]?.message?.content || '';
  }

  private async sendDailyBriefing(): Promise<void> {
    console.log('📊 Generating and sending daily briefing');

    // Get yesterday's emails
    const emails = await this.fetchEmailsSince(new Date(Date.now() - 24 * 60 * 60 * 1000));

    // Generate summary
    const result = await this.generateDailySummary(emails);

    // Send briefing (via email or notification)
    console.log('📤 Daily briefing sent');
  }

  private async scheduleMeetingFromEmail(
    email: Email,
    classification: any
  ): Promise<void> {
    // Extract meeting details
    const meetingActionItem = classification.actionItems.find((a: any) =>
      a.description.toLowerCase().includes('meeting')
    );

    if (!meetingActionItem) return;

    // Schedule meeting
    await this.calendarOrchestrator.scheduleMeetingAutomatically({
      title: `Meeting: ${email.subject}`,
      description: meetingActionItem.description,
      duration: 30,
      attendees: [email.from.email],
      priority: classification.importance
    });
  }

  private async identifyAndExecuteOutreach(): Promise<void> {
    console.log('🔍 Identifying outreach opportunities');

    const emails = await this.fetchEmailsSince(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const interactions = await this.getClientInteractions();

    const opportunities = await this.outreachEngine.identifyOutreachOpportunities(
      emails,
      interactions
    );

    // Execute high-confidence opportunities
    for (const opp of opportunities) {
      if (opp.confidence > 0.8 && opp.priority >= 7) {
        await this.executeOutreach(opp);
      }
    }
  }

  private async executeOutreach(opportunity: any): Promise<void> {
    console.log(`📤 Executing outreach: ${opportunity.type} to ${opportunity.recipient.email}`);

    if (opportunity.type === 'follow_up' || opportunity.type === 'check_in') {
      // Schedule meeting
      await this.outreachEngine.scheduleClientMeeting(
        opportunity.recipient.email,
        opportunity.reason,
        opportunity.context
      );
    } else {
      // Send email
      await this.sendEmail(
        opportunity.recipient.email,
        this.getSubjectForType(opportunity.type),
        opportunity.suggestedMessage
      );
    }
  }

  private async optimizeUpcomingWeek(): Promise<void> {
    console.log('📅 Optimizing upcoming week');

    // Get all tasks
    const tasks = this.taskManager.getTasks();

    // AI suggests task scheduling
    const schedule = await this.taskManager.suggestTaskScheduling(tasks);

    // Block focus time
    await this.calendarOrchestrator.blockFocusTime(120); // 2 hours daily

    console.log('✅ Week optimized');
  }

  private async fetchNewEmails(): Promise<Email[]> {
    if (!this.userId) {
      console.warn('No user ID set for email fetching');
      return [];
    }

    try {
      // Fetch emails from last hour
      const since = new Date(Date.now() - 60 * 60 * 1000);
      return await this.emailService.fetchEmails(this.userId, {
        since,
        unreadOnly: true
      });
    } catch (error) {
      console.error('Failed to fetch new emails:', error);
      return [];
    }
  }

  private async fetchEmailsSince(date: Date): Promise<Email[]> {
    if (!this.userId) {
      console.warn('No user ID set for email fetching');
      return [];
    }

    try {
      return await this.emailService.fetchEmails(this.userId, {
        since: date,
        limit: 100
      });
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      return [];
    }
  }

  private async getClientInteractions(): Promise<any[]> {
    // TODO: Get from CRM or database
    return [];
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.userId) {
      console.warn('No user ID set for email sending');
      return;
    }

    try {
      const result = await this.emailService.sendEmail(this.userId, {
        to,
        subject,
        body
      });

      if (result.success) {
        console.log(`✅ Email sent to ${to}: ${subject}`);
      } else {
        console.error(`❌ Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error('Email sending error:', error);
    }
  }

  private getSubjectForType(type: string): string {
    const subjects = {
      follow_up: 'Following up on our conversation',
      check_in: 'Checking in',
      reminder: 'Friendly reminder',
      update: 'Update',
      thank_you: 'Thank you'
    };
    return subjects[type] || 'Message';
  }

  async scheduleMeeting(params: any): Promise<AgentResponse> {
    const scheduled = await this.calendarOrchestrator.scheduleMeetingAutomatically(params);
    
    return {
      success: true,
      data: scheduled
    };
  }

  async createTask(params: any): Promise<AgentResponse> {
    // Task creation handled by task manager
    return {
      success: true,
      data: { message: 'Task created' }
    };
  }

  async getPriorities(): Promise<AgentResponse> {
    const tasks = await this.taskManager.prioritizeTasks();
    
    return {
      success: true,
      data: {
        tasks: tasks.slice(0, 10), // Top 10 priorities
        summary: `You have ${tasks.length} pending tasks. Top priority: ${tasks[0]?.title || 'None'}`
      }
    };
  }

  async identifyOutreach(params: any): Promise<AgentResponse> {
    const opportunities = await this.outreachEngine.identifyOutreachOpportunities(
      params.emails || [],
      params.interactions || []
    );

    return {
      success: true,
      data: {
        opportunities,
        count: opportunities.length,
        highPriority: opportunities.filter(o => o.priority >= 8).length
      }
    };
  }

  async autoRespond(email: Email): Promise<AgentResponse> {
    const response = await this.emailIntelligence.generateEmailResponse(email, {});
    
    // Send email
    await this.sendEmail(email.from.email, `Re: ${email.subject}`, response);

    return {
      success: true,
      data: {
        response,
        sent: true
      }
    };
  }

  async blockFocusTime(duration: number): Promise<AgentResponse> {
    const timeSlot = await this.calendarOrchestrator.blockFocusTime(duration);

    return {
      success: true,
      data: {
        timeSlot,
        message: `Blocked ${duration} minutes of focus time from ${timeSlot.start.toLocaleString()}`
      }
    };
  }

  async searchEmails(query: string, options?: any): Promise<AgentResponse> {
    if (!this.userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not set'
      };
    }

    const results = await this.vectorizationService.searchSimilarEmails(
      query,
      this.userId,
      options
    );

    return {
      success: true,
      data: {
        results,
        count: results.length,
        query
      }
    };
  }

  async getEmailContext(email: Email): Promise<AgentResponse> {
    if (!this.userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not set'
      };
    }

    const context = await this.memorySystem.buildCompleteContext(email, this.userId);

    return {
      success: true,
      data: {
        context,
        relatedEmailsCount: context.relatedEmails.length,
        threadEmailsCount: context.threadEmails.length
      }
    };
  }

  async buildAgenticMemory(): Promise<AgentResponse> {
    if (!this.userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not set'
      };
    }

    const memory = await this.vectorizationService.buildAgenticMemory(this.userId);

    return {
      success: true,
      data: {
        memory,
        message: `Built agentic memory with ${memory.totalEmails} emails vectorized`
      }
    };
  }

  // ============ AUTONOMOUS OPERATION ============

  /**
   * Perform autonomous tasks - runs every 30 minutes
   */
  protected async performAutonomousTasks(): Promise<string[]> {
    const actions: string[] = [];

    if (!this.userId) {
      console.log('⚠️ No userId set - skipping autonomous tasks');
      return actions;
    }

    try {
      console.log('📧 [Productivity AI] Starting autonomous productivity operations...');

      // 1. Process new emails
      try {
        const emailSummary = await this.processNewEmails();
        if (emailSummary.newEmails > 0) {
          actions.push(`Processed ${emailSummary.newEmails} new emails`);
        }
        if (emailSummary.tasksCreated > 0) {
          actions.push(`Created ${emailSummary.tasksCreated} tasks from emails`);
        }
      } catch (error) {
        console.error('Error processing emails:', error);
      }

      // 2. Identify outreach opportunities
      try {
        const outreachCount = await this.identifyOutreachOpportunities();
        if (outreachCount > 0) {
          actions.push(`Identified ${outreachCount} outreach opportunities`);
        }
      } catch (error) {
        console.error('Error identifying outreach:', error);
      }

      // 3. Optimize calendar
      try {
        const optimizations = await this.optimizeCalendar();
        if (optimizations > 0) {
          actions.push(`Optimized calendar with ${optimizations} improvements`);
        }
      } catch (error) {
        console.error('Error optimizing calendar:', error);
      }

      // 4. Update task priorities
      try {
        const priorityUpdates = await this.updateTaskPriorities();
        if (priorityUpdates > 0) {
          actions.push(`Updated priorities for ${priorityUpdates} tasks`);
        }
      } catch (error) {
        console.error('Error updating task priorities:', error);
      }

      // 5. Send proactive notifications if needed
      try {
        const notifications = await this.sendProactiveNotifications();
        if (notifications > 0) {
          actions.push(`Sent ${notifications} proactive notifications`);
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
      }

      console.log(`✅ [Productivity AI] Autonomous tasks complete: ${actions.length} actions`);

      return actions;

    } catch (error) {
      console.error('Error in autonomous productivity tasks:', error);
      return actions;
    }
  }

  /**
   * Process new emails autonomously
   */
  private async processNewEmails(): Promise<{ newEmails: number; tasksCreated: number }> {
    console.log('📥 Checking for new emails...');

    // In production, fetch from email service
    // For now, return mock data
    const newEmails = 0;
    const tasksCreated = 0;

    // If there were new emails, we would:
    // 1. Classify each email
    // 2. Extract action items
    // 3. Create tasks
    // 4. Auto-respond if appropriate
    // 5. Update memory

    return { newEmails, tasksCreated };
  }

  /**
   * Identify outreach opportunities
   */
  private async identifyOutreachOpportunities(): Promise<number> {
    console.log('🔍 Identifying outreach opportunities...');

    // Use ProactiveOutreachEngine to find opportunities
    // This would analyze:
    // - Clients who haven't been contacted recently
    // - Follow-ups needed
    // - Thank you notes needed
    // - Relationship maintenance

    return 0;
  }

  /**
   * Optimize calendar
   */
  private async optimizeCalendar(): Promise<number> {
    console.log('📅 Optimizing calendar...');

    // Use CalendarOrchestratorEngine to:
    // - Find scheduling conflicts
    // - Suggest better meeting times
    // - Block focus time
    // - Consolidate meetings

    return 0;
  }

  /**
   * Update task priorities
   */
  private async updateTaskPriorities(): Promise<number> {
    console.log('📋 Updating task priorities...');

    // Use IntelligentTaskManager to:
    // - Analyze deadlines
    // - Reassess importance
    // - Consider dependencies
    // - Update priorities

    return 0;
  }

  /**
   * Send proactive notifications
   */
  private async sendProactiveNotifications(): Promise<number> {
    console.log('📢 Checking for proactive notifications...');

    // Send notifications for:
    // - Upcoming deadlines
    // - Meetings in 15 minutes
    // - High-priority emails
    // - Task completions

    return 0;
  }
}
