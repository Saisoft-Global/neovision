import type { AgentConfig } from '../../types/agent-framework';
import type { AgentResponse } from '../agent/types';
import { BaseAgent } from './BaseAgent';
import { createChatCompletion } from '../../openai/chat';
import type { Email } from '../../types/email';

export interface CRMLeadData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status?: string;
  source?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CRMIntent {
  action: 'create_lead' | 'update_lead' | 'create_opportunity' | 'schedule_followup' | 'add_note' | 'none';
  confidence: number;
  extractedData: CRMLeadData;
  originalEmail: Email;
}

export class CRMEmailAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'process_crm_email':
          return await this.processCRMEmail(params.email as Email);
        case 'extract_crm_intent':
          return await this.extractCRMIntent(params.email as Email);
        case 'execute_crm_action':
          return await this.executeCRMAction(params.intent as CRMIntent);
        case 'validate_crm_data':
          return await this.validateCRMData(params.data as CRMLeadData);
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

  private async processCRMEmail(email: Email): Promise<AgentResponse> {
    try {
      // Step 1: Extract CRM intent from email
      const intent = await this.extractCRMIntent(email);
      
      if (!intent.success || intent.data.action === 'none') {
        return {
          success: true,
          data: {
            processed: false,
            reason: 'No CRM-related action detected',
            email: email
          }
        };
      }

      // Step 2: Validate extracted data
      const validation = await this.validateCRMData(intent.data.extractedData);
      if (!validation.success) {
        return {
          success: false,
          data: null,
          error: `Data validation failed: ${validation.error}`
        };
      }

      // Step 3: Execute CRM action
      const crmResult = await this.executeCRMAction(intent.data);
      
      return {
        success: true,
        data: {
          processed: true,
          intent: intent.data,
          crmResult: crmResult.data,
          email: email
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to process CRM email'
      };
    }
  }

  private async extractCRMIntent(email: Email): Promise<AgentResponse> {
    try {
      const systemPrompt = `You are an AI assistant specialized in analyzing emails for CRM actions. 

Analyze the email and determine if it contains CRM-related information that should trigger actions like:
- Creating new leads
- Updating existing leads
- Creating opportunities
- Scheduling follow-ups
- Adding notes to existing records

Extract structured data from the email and return in this JSON format:
{
  "action": "create_lead|update_lead|create_opportunity|schedule_followup|add_note|none",
  "confidence": 0.8,
  "extractedData": {
    "name": "Full name if mentioned",
    "email": "Email address",
    "company": "Company name if mentioned",
    "phone": "Phone number if mentioned", 
    "status": "Lead status if mentioned (cold|warm|hot|qualified)",
    "source": "Lead source if mentioned (email|phone|website|referral)",
    "notes": "Important notes or context",
    "priority": "low|medium|high"
  }
}

Examples:
- "Hi, I'm John Smith from ABC Corp. I'm interested in your premium package." → create_lead
- "Please update the status of John Smith to 'Hot Lead'" → update_lead
- "We have a new opportunity worth $50K from XYZ Company" → create_opportunity
- "Follow up with Microsoft lead next week" → schedule_followup

If no CRM action is needed, set action to "none".`;

      const response = await createChatCompletion([
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Email Subject: ${email.subject}\n\nEmail Content: ${email.content}\n\nSender: ${email.from}\n\nRecipients: ${email.to?.join(', ')}`
        }
      ]);

      const intentText = response?.choices[0]?.message?.content || '';
      
      try {
        const intent = JSON.parse(intentText) as CRMIntent;
        intent.originalEmail = email;
        
        return {
          success: true,
          data: intent
        };
      } catch (parseError) {
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response into CRM intent format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to extract CRM intent'
      };
    }
  }

  private async validateCRMData(data: CRMLeadData): Promise<AgentResponse> {
    try {
      // Basic validation rules
      const errors: string[] = [];
      
      if (!data.name || data.name.trim().length < 2) {
        errors.push('Name is required and must be at least 2 characters');
      }
      
      if (!data.email || !this.isValidEmail(data.email)) {
        errors.push('Valid email address is required');
      }
      
      if (data.phone && !this.isValidPhone(data.phone)) {
        errors.push('Phone number format is invalid');
      }
      
      if (data.status && !['cold', 'warm', 'hot', 'qualified', 'converted'].includes(data.status)) {
        errors.push('Invalid lead status');
      }
      
      if (errors.length > 0) {
        return {
          success: false,
          data: null,
          error: `Validation errors: ${errors.join(', ')}`
        };
      }
      
      return {
        success: true,
        data: { valid: true, data }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to validate CRM data'
      };
    }
  }

  private async executeCRMAction(intent: CRMIntent): Promise<AgentResponse> {
    try {
      const { action, extractedData } = intent;
      
      switch (action) {
        case 'create_lead':
          return await this.createCRMLead(extractedData);
        case 'update_lead':
          return await this.updateCRMLead(extractedData);
        case 'create_opportunity':
          return await this.createCRMOpportunity(extractedData);
        case 'schedule_followup':
          return await this.scheduleCRMFollowup(extractedData);
        case 'add_note':
          return await this.addCRMNote(extractedData);
        default:
          return {
            success: true,
            data: { action: 'none', message: 'No CRM action required' }
          };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to execute CRM action'
      };
    }
  }

  private async createCRMLead(data: CRMLeadData): Promise<AgentResponse> {
    try {
      // This would integrate with actual CRM APIs (Salesforce, HubSpot, etc.)
      const crmPayload = {
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
        email: data.email,
        company: data.company,
        phone: data.phone,
        leadStatus: data.status || 'cold',
        leadSource: data.source || 'email',
        description: data.notes,
        priority: data.priority || 'medium'
      };

      // Example API call (would be replaced with actual CRM API)
      const response = await this.callCRMAPI('POST', '/api/leads', crmPayload);
      
      return {
        success: true,
        data: {
          action: 'create_lead',
          leadId: response.id,
          status: 'created',
          data: crmPayload
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create CRM lead'
      };
    }
  }

  private async updateCRMLead(data: CRMLeadData): Promise<AgentResponse> {
    try {
      // Find existing lead first
      const searchResponse = await this.callCRMAPI('GET', `/api/leads/search?email=${data.email}`);
      
      if (!searchResponse.leads || searchResponse.leads.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Lead not found for update'
        };
      }

      const leadId = searchResponse.leads[0].id;
      const updatePayload = {
        leadStatus: data.status,
        description: data.notes,
        priority: data.priority
      };

      const response = await this.callCRMAPI('PUT', `/api/leads/${leadId}`, updatePayload);
      
      return {
        success: true,
        data: {
          action: 'update_lead',
          leadId: leadId,
          status: 'updated',
          data: updatePayload
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update CRM lead'
      };
    }
  }

  private async createCRMOpportunity(data: CRMLeadData): Promise<AgentResponse> {
    try {
      const opportunityPayload = {
        name: `${data.company} - ${data.notes}`,
        accountId: await this.findOrCreateAccount(data.company),
        amount: this.extractAmount(data.notes),
        stage: 'prospecting',
        probability: 10,
        closeDate: this.calculateCloseDate(),
        description: data.notes
      };

      const response = await this.callCRMAPI('POST', '/api/opportunities', opportunityPayload);
      
      return {
        success: true,
        data: {
          action: 'create_opportunity',
          opportunityId: response.id,
          status: 'created',
          data: opportunityPayload
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create CRM opportunity'
      };
    }
  }

  private async scheduleCRMFollowup(data: CRMLeadData): Promise<AgentResponse> {
    try {
      const followupPayload = {
        subject: `Follow up with ${data.name}`,
        description: data.notes,
        dueDate: this.calculateFollowupDate(),
        priority: data.priority || 'medium',
        relatedTo: 'lead'
      };

      const response = await this.callCRMAPI('POST', '/api/tasks', followupPayload);
      
      return {
        success: true,
        data: {
          action: 'schedule_followup',
          taskId: response.id,
          status: 'scheduled',
          data: followupPayload
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to schedule CRM followup'
      };
    }
  }

  private async addCRMNote(data: CRMLeadData): Promise<AgentResponse> {
    try {
      const searchResponse = await this.callCRMAPI('GET', `/api/leads/search?email=${data.email}`);
      
      if (!searchResponse.leads || searchResponse.leads.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Lead not found for adding note'
        };
      }

      const leadId = searchResponse.leads[0].id;
      const notePayload = {
        leadId: leadId,
        content: data.notes,
        type: 'note'
      };

      const response = await this.callCRMAPI('POST', '/api/notes', notePayload);
      
      return {
        success: true,
        data: {
          action: 'add_note',
          noteId: response.id,
          leadId: leadId,
          status: 'added',
          data: notePayload
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to add CRM note'
      };
    }
  }

  private async callCRMAPI(method: string, endpoint: string, data?: any): Promise<any> {
    // This would be replaced with actual CRM API integration
    // Examples: Salesforce REST API, HubSpot API, Pipedrive API, etc.
    
    const baseURL = process.env.CRM_API_URL || 'https://api.yourcrm.com';
    const apiKey = process.env.CRM_API_KEY;
    
    if (!apiKey) {
      throw new Error('CRM API key not configured');
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`CRM API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private async findOrCreateAccount(companyName: string): Promise<string> {
    try {
      // Try to find existing account
      const searchResponse = await this.callCRMAPI('GET', `/api/accounts/search?name=${companyName}`);
      
      if (searchResponse.accounts && searchResponse.accounts.length > 0) {
        return searchResponse.accounts[0].id;
      }

      // Create new account if not found
      const accountPayload = {
        name: companyName,
        type: 'customer'
      };

      const createResponse = await this.callCRMAPI('POST', '/api/accounts', accountPayload);
      return createResponse.id;
    } catch (error) {
      throw new Error(`Failed to find or create account: ${error}`);
    }
  }

  private extractAmount(notes: string): number {
    // Extract monetary amounts from notes
    const amountMatch = notes.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    return amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  }

  private calculateCloseDate(): string {
    // Calculate close date (e.g., 30 days from now)
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  private calculateFollowupDate(): string {
    // Calculate followup date (e.g., 7 days from now)
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}
