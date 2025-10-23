import { createChatCompletion } from '../openai/chat';
import type { Email } from '../../types/email';
import type { Meeting } from '../../types/meeting';
import type { EmailClassification } from './EmailIntelligenceEngine';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number; // 1-10
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  source: 'email' | 'meeting' | 'manual' | 'ai_suggested';
  sourceId?: string;
  assignee?: string;
  tags: string[];
  dependencies: string[]; // task IDs
  estimatedDuration?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskSuggestion {
  task: Task;
  rationale: string;
  confidence: number;
}

export class IntelligentTaskManager {
  private static instance: IntelligentTaskManager;
  private tasks: Map<string, Task> = new Map();

  private constructor() {}

  public static getInstance(): IntelligentTaskManager {
    if (!this.instance) {
      this.instance = new IntelligentTaskManager();
    }
    return this.instance;
  }

  async createTasksFromEmail(
    email: Email,
    classification: EmailClassification
  ): Promise<Task[]> {
    console.log(`✅ Creating tasks from email: ${email.subject}`);

    const tasks: Task[] = [];

    // Create tasks from identified action items
    for (const actionItem of classification.actionItems) {
      const task = await this.createTask({
        title: actionItem.description,
        description: `From email: ${email.subject}\nSender: ${email.from.name}`,
        priority: actionItem.priority,
        dueDate: actionItem.deadline,
        source: 'email',
        sourceId: email.id,
        tags: this.extractTags(email, actionItem)
      });

      tasks.push(task);
    }

    // AI suggests additional tasks if needed
    const suggestedTasks = await this.suggestAdditionalTasks(email, classification);
    tasks.push(...suggestedTasks);

    return tasks;
  }

  async createTasksFromMeeting(meeting: Meeting): Promise<Task[]> {
    console.log(`✅ Creating tasks from meeting: ${meeting.title}`);

    // AI extracts action items from meeting
    const actionItems = await this.extractMeetingActionItems(meeting);

    const tasks = await Promise.all(
      actionItems.map(item => this.createTask({
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        source: 'meeting',
        sourceId: meeting.id,
        assignee: item.assignee,
        tags: ['meeting-action', meeting.title]
      }))
    );

    return tasks;
  }

  async prioritizeTasks(): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values())
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled');

    // AI prioritizes based on multiple factors
    const prioritized = await this.aiPrioritize(allTasks);

    return prioritized;
  }

  async suggestTaskScheduling(tasks: Task[]): Promise<Map<string, Date>> {
    // AI suggests when to work on each task
    const schedule = await createChatCompletion([
      {
        role: 'system',
        content: `You are an expert productivity coach. Suggest optimal scheduling for these tasks.
        
        Consider:
        1. Task priorities and deadlines
        2. Dependencies between tasks
        3. Estimated durations
        4. Energy levels throughout day (morning for complex, afternoon for routine)
        4. Batch similar tasks together
        5. Leave buffer time
        6. Balance workload across days
        
        Return JSON mapping task IDs to suggested dates/times.`
      },
      {
        role: 'user',
        content: JSON.stringify(tasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          estimatedDuration: t.estimatedDuration,
          dependencies: t.dependencies
        })))
      }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.3
    });

    const scheduleText = schedule?.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(scheduleText);

    const schedulingMap = new Map<string, Date>();
    Object.entries(parsed).forEach(([taskId, dateStr]) => {
      schedulingMap.set(taskId, new Date(dateStr as string));
    });

    return schedulingMap;
  }

  async createReminders(task: Task): Promise<void> {
    if (!task.dueDate) return;

    // Calculate reminder times
    const reminders = this.calculateReminderTimes(task);

    for (const reminderTime of reminders) {
      await this.scheduleReminder(task, reminderTime);
    }
  }

  private calculateReminderTimes(task: Task): Date[] {
    if (!task.dueDate) return [];

    const reminders: Date[] = [];
    const now = new Date();
    const dueDate = task.dueDate;
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const daysUntilDue = timeUntilDue / (1000 * 60 * 60 * 24);

    // High priority: More frequent reminders
    if (task.priority >= 8) {
      if (daysUntilDue > 7) reminders.push(new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000)); // 1 week before
      if (daysUntilDue > 3) reminders.push(new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000)); // 3 days before
      if (daysUntilDue > 1) reminders.push(new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000)); // 1 day before
      reminders.push(new Date(dueDate.getTime() - 2 * 60 * 60 * 1000)); // 2 hours before
    } else {
      // Normal priority
      if (daysUntilDue > 3) reminders.push(new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000));
      if (daysUntilDue > 1) reminders.push(new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000));
    }

    return reminders.filter(r => r > now);
  }

  private async scheduleReminder(task: Task, reminderTime: Date): Promise<void> {
    console.log(`⏰ Scheduling reminder for ${task.title} at ${reminderTime}`);
    // TODO: Integrate with notification system
  }

  private async createTask(params: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      title: params.title || 'Untitled Task',
      description: params.description || '',
      priority: params.priority || 5,
      dueDate: params.dueDate,
      status: 'pending',
      source: params.source || 'manual',
      sourceId: params.sourceId,
      assignee: params.assignee,
      tags: params.tags || [],
      dependencies: params.dependencies || [],
      estimatedDuration: params.estimatedDuration,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);

    // Create reminders
    await this.createReminders(task);

    return task;
  }

  private extractTags(email: Email, actionItem: any): string[] {
    const tags: string[] = [];

    // Extract from subject
    if (email.subject.toLowerCase().includes('urgent')) tags.push('urgent');
    if (email.subject.toLowerCase().includes('important')) tags.push('important');

    // Extract from sender
    tags.push(`from:${email.from.email.split('@')[0]}`);

    // Extract from action item
    if (actionItem.description.toLowerCase().includes('review')) tags.push('review');
    if (actionItem.description.toLowerCase().includes('approve')) tags.push('approval');

    return tags;
  }

  private async suggestAdditionalTasks(
    email: Email,
    classification: EmailClassification
  ): Promise<Task[]> {
    // AI suggests implicit tasks
    const suggestions = await createChatCompletion([
      {
        role: 'system',
        content: `Identify implicit tasks that should be created from this email.
        
        Look for:
        - Preparation needed before responding
        - Follow-up actions implied
        - Research or information gathering needed
        - Coordination with others required
        
        Return array of task suggestions with title, priority, and rationale.`
      },
      {
        role: 'user',
        content: `Email: ${email.subject}\n${email.content}\n\nExplicit action items: ${JSON.stringify(classification.actionItems)}`
      }
    ]);

    // Parse and create suggested tasks
    return [];
  }

  private async extractMeetingActionItems(meeting: Meeting): Promise<any[]> {
    // AI extracts action items from meeting description/notes
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `Extract action items from this meeting.
        
        For each action item, identify:
        - What needs to be done
        - Who should do it (if mentioned)
        - When it's due (if mentioned)
        - Priority level
        `
      },
      {
        role: 'user',
        content: `Meeting: ${meeting.title}\nDescription: ${meeting.description}`
      }
    ]);

    // Parse action items
    return [];
  }

  private async aiPrioritize(tasks: Task[]): Promise<Task[]> {
    const prioritized = await createChatCompletion([
      {
        role: 'system',
        content: `Prioritize these tasks intelligently.
        
        Consider:
        1. Due dates (urgent deadlines first)
        2. Dependencies (blocking tasks first)
        3. Priority scores
        4. Impact vs effort
        5. Strategic importance
        
        Return tasks in priority order with reasoning.`
      },
      {
        role: 'user',
        content: JSON.stringify(tasks)
      }
    ]);

    // For now, return sorted by priority and due date
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      return 0;
    });
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');

    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    this.tasks.set(id, updated);
    return updated;
  }
}
