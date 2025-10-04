import type { Email } from '../../types/email';
import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { processIncomingEmail } from '../email/processor';
import { generateResponse } from '../email/generators/responseGenerator';

export class EmailAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'process_email':
        return this.processEmail(params.email as Email);
      case 'generate_response':
        return this.generateEmailResponse(params.email as Email, params.context);
      case 'send_email':
        return this.sendEmail(params.email as Email);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async processEmail(email: Email) {
    const { intent, meetingDetails, suggestedResponse } = await processIncomingEmail(email);
    return { intent, meetingDetails, suggestedResponse };
  }

  private async generateEmailResponse(email: Email, context: any) {
    return generateResponse(email, context.intent as string, context);
  }

  private async sendEmail(email: Email) {
    // Implementation for sending email would go here
    return { success: true, emailId: email.id };
  }
}