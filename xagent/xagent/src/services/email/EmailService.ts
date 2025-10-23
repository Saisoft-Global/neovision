import type { Email } from '../../types/email';
import { getSupabaseClient } from '../../config/supabase';
import { EmailAgent } from '../agents/EmailAgent';
import { AgentFactory } from '../agent/AgentFactory';

export class EmailService {
  private static instance: EmailService;
  private emailAgent: EmailAgent;
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.initializeAgent();
  }

  public static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  private async initializeAgent() {
    // Skip agent initialization for now to avoid errors
    // This will be properly implemented when email agents are created
    console.log('EmailService initialized without agent (will be implemented later)');
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