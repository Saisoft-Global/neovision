import type { Email } from '../../types/email';
import { createClient } from '@supabase/supabase-js';
import { EmailAgent } from '../agents/EmailAgent';
import { AgentFactory } from '../agent/AgentFactory';

export class EmailService {
  private static instance: EmailService;
  private emailAgent: EmailAgent;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.initializeAgent();
  }

  public static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  private async initializeAgent() {
    const factory = AgentFactory.getInstance();
    this.emailAgent = await factory.getAgent('email') as EmailAgent;
  }

  public async processIncomingEmail(email: Email) {
    // Store email in database
    await this.storeEmail(email);

    // Process email with agent
    const result = await this.emailAgent.execute('process_email', { email });

    // Generate and send response if needed
    if (result.suggestedResponse) {
      await this.sendResponse(email, result.suggestedResponse);
    }

    return result;
  }

  private async storeEmail(email: Email) {
    const { error } = await this.supabase
      .from('emails')
      .insert({
        id: email.id,
        subject: email.subject,
        from: email.from,
        to: email.to,
        content: email.content,
        status: email.status,
        thread_id: email.threadId,
      });

    if (error) throw error;
  }

  private async sendResponse(originalEmail: Email, response: string) {
    const responseEmail: Email = {
      id: crypto.randomUUID(),
      subject: `Re: ${originalEmail.subject}`,
      from: {
        email: 'ai-assistant@example.com',
        name: 'AI Assistant',
      },
      to: [originalEmail.from],
      content: response,
      timestamp: new Date(),
      threadId: originalEmail.threadId,
      status: 'sent',
    };

    await this.emailAgent.execute('send_email', { email: responseEmail });
  }
}