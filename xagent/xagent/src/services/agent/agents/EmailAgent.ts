import type { Email } from '../../../types/email';
import type { AgentConfig } from '../../../types/agent-framework';
import type { AgentResponse } from '../types';
import { BaseAgent } from '../BaseAgent';
import { processIncomingEmail } from '../../email/processor';
import { generateResponse } from '../../email/generators/responseGenerator';

export class EmailAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig, organizationId: string | null = null) {
    super(id, config, organizationId);  // ✅ Pass organizationId to BaseAgent
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'process_email':
          return {
            success: true,
            data: await this.processEmail(params.email as Email)
          };
        case 'generate_response':
          return {
            success: true,
            data: await this.generateEmailResponse(params.email as Email, params.context)
          };
        case 'send_email':
          return {
            success: true,
            data: await this.sendEmail(params.email as Email)
          };
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
    return { emailId: email.id };
  }
}