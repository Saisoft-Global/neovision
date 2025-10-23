/**
 * Enhanced Workflow Executor
 * Executes workflows with real third-party API calls
 */

import { GoogleWorkspaceConnector } from '../integrations/GoogleWorkspaceConnector';
import { SalesforceConnector } from '../integrations/SalesforceConnector';
import { HRSystemConnector } from '../integrations/HRSystemConnector';
import { PayrollConnector } from '../integrations/PayrollConnector';
import { EmailService } from '../email/EmailService';
import type { Workflow, WorkflowNode } from '../../types/workflow';
import type { APIResponse } from '../integrations/base/APIConnector';

export interface WorkflowExecutionContext {
  userId: string;
  agentId: string;
  inputData: Record<string, unknown>;
  credentials?: {
    google?: any;
    salesforce?: any;
    hrSystem?: any;
    payroll?: any;
  };
}

export interface WorkflowExecutionResult {
  success: boolean;
  nodeResults: Array<{
    nodeId: string;
    nodeName: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  finalOutput?: any;
  error?: string;
  executionTime: number;
}

export class EnhancedWorkflowExecutor {
  private googleConnector: GoogleWorkspaceConnector | null = null;
  private salesforceConnector: SalesforceConnector | null = null;
  private hrConnector: HRSystemConnector | null = null;
  private payrollConnector: PayrollConnector | null = null;
  private emailService: EmailService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  /**
   * Execute a complete workflow with real API integrations
   */
  async executeWorkflow(
    workflow: Workflow,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const nodeResults: any[] = [];

    console.log(`🔄 Executing workflow: ${workflow.name}`);

    try {
      // Initialize connectors if credentials provided
      await this.initializeConnectors(context.credentials);

      // Execute nodes in sequence (following connections)
      const executionOrder = this.determineExecutionOrder(workflow);
      const executionContext = { ...context.inputData };

      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        console.log(`  ├─ Executing node: ${node.label || node.id}`);

        const result = await this.executeNode(node, executionContext);
        nodeResults.push({
          nodeId: node.id,
          nodeName: node.label || node.id,
          success: result.success,
          data: result.data,
          error: result.error,
        });

        if (!result.success) {
          console.error(`  └─ ❌ Node failed: ${result.error}`);
          
          // Decide whether to continue or stop
          if (this.isNodeCritical(node)) {
            throw new Error(`Critical node failed: ${node.label || node.id}`);
          }
        } else {
          console.log(`  └─ ✅ Node completed successfully`);
          
          // Merge node output into execution context for next nodes
          if (result.data) {
            Object.assign(executionContext, result.data);
          }
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Workflow completed in ${executionTime}ms`);

      return {
        success: true,
        nodeResults,
        finalOutput: executionContext,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Workflow execution failed:', error);

      return {
        success: false,
        nodeResults,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      };
    } finally {
      // Cleanup connectors
      await this.cleanupConnectors();
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    const { action, parameters } = node;

    try {
      switch (action) {
        // Information collection
        case 'collect_information':
          return this.collectInformation(parameters, context);

        // Google Workspace actions
        case 'create_email_account':
        case 'create_google_account':
          return await this.createGoogleAccount(parameters, context);

        case 'create_calendar_event':
          return await this.createCalendarEvent(parameters, context);

        case 'send_gmail':
          return await this.sendGmail(parameters, context);

        // HR System actions
        case 'create_employee_profile':
        case 'create_hr_profile':
          return await this.createHRProfile(parameters, context);

        case 'submit_leave_request':
          return await this.submitLeaveRequest(parameters, context);

        case 'get_leave_balance':
          return await this.getLeaveBalance(parameters, context);

        // Payroll actions
        case 'setup_payroll':
          return await this.setupPayroll(parameters, context);

        // Salesforce actions
        case 'create_salesforce_lead':
        case 'create_lead':
          return await this.createSalesforceLead(parameters, context);

        case 'create_opportunity':
          return await this.createOpportunity(parameters, context);

        case 'create_contact':
          return await this.createContact(parameters, context);

        // Email actions
        case 'send_email':
          return await this.sendEmail(parameters, context);

        // Generic actions
        case 'log':
        case 'notify':
          return this.logAction(parameters, context);

        default:
          console.warn(`Unknown action: ${action}`);
          return {
            success: true,
            data: { message: `Action ${action} acknowledged but not implemented` },
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Node execution failed',
      };
    }
  }

  // ===== Node Action Implementations =====

  private collectInformation(
    parameters: any,
    context: Record<string, unknown>
  ): APIResponse {
    const requiredFields = parameters.required_fields || [];
    const collected: Record<string, any> = {};

    for (const field of requiredFields) {
      if (context[field]) {
        collected[field] = context[field];
      }
    }

    return {
      success: true,
      data: collected,
    };
  }

  private async createGoogleAccount(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.googleConnector) {
      return {
        success: false,
        error: 'Google Workspace not configured',
      };
    }

    const email = context.email as string || 
      `${(context.first_name as string || '').toLowerCase()}.${(context.last_name as string || '').toLowerCase()}@company.com`;

    return await this.googleConnector.createUserAccount({
      primaryEmail: email,
      name: {
        givenName: context.first_name as string || '',
        familyName: context.last_name as string || '',
        fullName: context.full_name as string || `${context.first_name} ${context.last_name}`,
      },
    });
  }

  private async createCalendarEvent(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.googleConnector) {
      return {
        success: false,
        error: 'Google Calendar not configured',
      };
    }

    return await this.googleConnector.createCalendarEvent({
      summary: parameters.summary || context.event_title as string,
      description: parameters.description || context.event_description as string,
      start: {
        dateTime: context.start_time as string || new Date().toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: context.end_time as string || new Date(Date.now() + 3600000).toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: context.attendees as any[],
    });
  }

  private async sendGmail(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.googleConnector) {
      return await this.sendEmail(parameters, context);
    }

    return await this.googleConnector.sendEmail(
      context.recipient_email as string || parameters.to,
      context.subject as string || parameters.subject,
      context.body as string || parameters.body
    );
  }

  private async createHRProfile(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.hrConnector) {
      return {
        success: false,
        error: 'HR System not configured',
      };
    }

    return await this.hrConnector.createEmployee({
      firstName: context.first_name as string || context.firstName as string,
      lastName: context.last_name as string || context.lastName as string,
      email: context.email as string,
      jobTitle: context.job_title as string || context.role as string,
      department: context.department as string,
      startDate: context.start_date as string,
      employmentType: context.employment_type as any || 'full_time',
    });
  }

  private async submitLeaveRequest(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.hrConnector) {
      return {
        success: false,
        error: 'HR System not configured',
      };
    }

    return await this.hrConnector.submitLeaveRequest({
      employeeId: context.employee_id as string,
      leaveType: context.leave_type as any || 'vacation',
      startDate: context.start_date as string,
      endDate: context.end_date as string,
      reason: context.reason as string,
    });
  }

  private async getLeaveBalance(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.hrConnector) {
      return {
        success: false,
        error: 'HR System not configured',
      };
    }

    return await this.hrConnector.getLeaveBalance(context.employee_id as string);
  }

  private async setupPayroll(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.payrollConnector) {
      return {
        success: false,
        error: 'Payroll system not configured',
      };
    }

    return await this.payrollConnector.setupEmployeePayroll({
      employeeId: context.employee_id as string,
      salary: context.salary as number,
      payFrequency: context.pay_frequency as any || 'biweekly',
      bankAccount: context.bank_account as any,
      taxWithholding: context.tax_withholding as any || { federalAllowances: 0 },
      startDate: context.start_date as string,
    });
  }

  private async createSalesforceLead(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.salesforceConnector) {
      return {
        success: false,
        error: 'Salesforce not configured',
      };
    }

    return await this.salesforceConnector.createLead({
      FirstName: context.first_name as string || context.firstName as string,
      LastName: context.last_name as string || context.lastName as string,
      Company: context.company as string,
      Email: context.email as string,
      Phone: context.phone as string,
      Status: 'Open - Not Contacted',
      LeadSource: 'AI Agent',
      Description: context.description as string || parameters.description,
    });
  }

  private async createOpportunity(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.salesforceConnector) {
      return {
        success: false,
        error: 'Salesforce not configured',
      };
    }

    return await this.salesforceConnector.createOpportunity({
      Name: context.opportunity_name as string || parameters.name,
      StageName: context.stage as string || 'Prospecting',
      CloseDate: context.close_date as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Amount: context.amount as number,
      Description: context.description as string,
    });
  }

  private async createContact(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    if (!this.salesforceConnector) {
      return {
        success: false,
        error: 'Salesforce not configured',
      };
    }

    return await this.salesforceConnector.createContact({
      FirstName: context.first_name as string,
      LastName: context.last_name as string,
      Email: context.email as string,
      Phone: context.phone as string,
    });
  }

  private async sendEmail(
    parameters: any,
    context: Record<string, unknown>
  ): Promise<APIResponse> {
    try {
      const to = context.recipient_email as string || parameters.to;
      const subject = context.subject as string || parameters.subject;
      const body = context.body as string || parameters.body;

      await this.emailService.sendEmail({
        to: [to],
        subject,
        body,
        from: 'noreply@xagent.com',
      });

      return {
        success: true,
        data: { message: 'Email sent successfully', to, subject },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  private logAction(parameters: any, context: Record<string, unknown>): APIResponse {
    const message = parameters.message || 'Action logged';
    console.log(`📝 Workflow Log: ${message}`, context);
    
    return {
      success: true,
      data: { logged: true, message },
    };
  }

  // ===== Helper Methods =====

  /**
   * Initialize API connectors based on provided credentials
   */
  private async initializeConnectors(credentials?: any): Promise<void> {
    if (!credentials) return;

    try {
      if (credentials.google) {
        this.googleConnector = new GoogleWorkspaceConnector(credentials.google);
        await this.googleConnector.connect();
      }

      if (credentials.salesforce) {
        this.salesforceConnector = new SalesforceConnector(credentials.salesforce);
        await this.salesforceConnector.connect();
      }

      if (credentials.hrSystem) {
        this.hrConnector = new HRSystemConnector(credentials.hrSystem);
        await this.hrConnector.connect();
      }

      if (credentials.payroll) {
        this.payrollConnector = new PayrollConnector(credentials.payroll);
        await this.payrollConnector.connect();
      }
    } catch (error) {
      console.warn('Some connectors failed to initialize:', error);
    }
  }

  /**
   * Cleanup connectors after execution
   */
  private async cleanupConnectors(): Promise<void> {
    try {
      await Promise.all([
        this.googleConnector?.disconnect(),
        this.salesforceConnector?.disconnect(),
        this.hrConnector?.disconnect(),
        this.payrollConnector?.disconnect(),
      ]);
    } catch (error) {
      console.warn('Error during connector cleanup:', error);
    }
  }

  /**
   * Determine execution order based on workflow connections
   */
  private determineExecutionOrder(workflow: Workflow): string[] {
    const nodes = workflow.nodes;
    const connections = workflow.connections || [];
    
    // Build adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    connections.forEach(conn => {
      graph.get(conn.from)?.push(conn.to);
      inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    });
    
    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    const result: string[] = [];
    
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      graph.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    // If no connections, return nodes in original order
    return result.length === nodes.length ? result : nodes.map(n => n.id);
  }

  /**
   * Check if node is critical (failure should stop workflow)
   */
  private isNodeCritical(node: WorkflowNode): boolean {
    // For now, all nodes are critical
    // Can be made configurable via node.parameters.critical
    return node.parameters?.critical !== false;
  }
}

