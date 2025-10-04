import type { Email } from '../../types/email';
import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from '../agent/BaseAgent';
import { processIncomingEmail } from '../email/processor';
import { generateResponse } from '../email/generators/responseGenerator';

export class EmailAgent extends BaseAgent {
  constructor(id?: string, config?: AgentConfig) {
    super(id || crypto.randomUUID(), config || {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    });
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
    return processIncomingEmail(email);
  }

  private async generateEmailResponse(email: Email, context: any) {
    return generateResponse(email, context.intent as string, context);
  }

  private async sendEmail(email: Email) {
    // Implementation for sending email would go here
    return { success: true, emailId: email.id };
  }
}