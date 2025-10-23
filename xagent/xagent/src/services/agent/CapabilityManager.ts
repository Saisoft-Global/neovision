/**
 * Capability Manager
 * Dynamically determines agent capabilities based on skills, tools, and workflows
 */

import { createClient } from '@supabase/supabase-js';
import { 
  AgentSkill, 
  AgentCapability, 
  AgentTool, 
  AgentFunction 
} from '../../types/agent-framework';
import { toolRegistry } from '../tools/ToolRegistry';

export interface ToolCapability {
  id: string;
  name: string;
  description: string;
  skills: string[];
  isActive: boolean;
}

export interface WorkflowCapability {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  nodes: any[];
}

export class CapabilityManager {
  private supabase: ReturnType<typeof createClient>;
  private agentId: string;
  private capabilities: Map<string, AgentCapability> = new Map();

  constructor(agentId: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.agentId = agentId;
  }

  /**
   * Initialize and discover all agent capabilities
   */
  async discoverCapabilities(): Promise<AgentCapability[]> {
    console.log(`🔍 Discovering capabilities for agent ${this.agentId}...`);

    // 1. Get agent's skills
    const skills = await this.getAgentSkills();
    console.log(`📚 Agent has ${skills.length} skills`);

    // 2. Get attached tools
    const tools = await this.getAttachedTools();
    console.log(`🔧 Agent has ${tools.length} tools attached`);

    // 3. Get linked workflows
    const workflows = await this.getLinkedWorkflows();
    console.log(`⚙️ Agent has ${workflows.length} workflows linked`);

    // 4. Determine capabilities based on combinations
    const discoveredCapabilities = this.determineCapabilities(skills, tools, workflows);
    console.log(`✅ Discovered ${discoveredCapabilities.length} capabilities`);

    // Store in cache
    discoveredCapabilities.forEach(cap => {
      this.capabilities.set(cap.id, cap);
    });

    return discoveredCapabilities;
  }

  /**
   * Get agent's skills from database
   */
  private async getAgentSkills(): Promise<AgentSkill[]> {
    const { data: skills, error } = await this.supabase
      .from('agent_skills')
      .select('skill_name, skill_level, config')
      .eq('agent_id', this.agentId);

    if (error) {
      console.error('Error fetching agent skills:', error);
      return [];
    }

    if (!skills || skills.length === 0) {
      return [];
    }

    return skills.map(skill => ({
      name: skill.skill_name,
      level: skill.skill_level,
      config: skill.config || {}
    }));
  }

  /**
   * Get tools attached to agent
   */
  private async getAttachedTools(): Promise<ToolCapability[]> {
    // In a full implementation, you'd have an agent_tools table
    // For now, we'll check the ToolRegistry
    
    // Simulated: In production, query from database
    const tools: ToolCapability[] = [
      {
        id: 'document_upload',
        name: 'Document Upload',
        description: 'Upload and process documents',
        skills: ['document_processing', 'ocr', 'data_extraction'],
        isActive: true
      },
      {
        id: 'email_tool',
        name: 'Email Tool',
        description: 'Send and process emails',
        skills: ['email_sending', 'email_parsing'],
        isActive: true
      },
      {
        id: 'crm_tool',
        name: 'CRM Tool',
        description: 'Interact with Salesforce',
        skills: ['lead_management', 'crm_operations'],
        isActive: true
      }
    ];

    return tools;
  }

  /**
   * Get workflows linked to agent
   */
  private async getLinkedWorkflows(): Promise<WorkflowCapability[]> {
    const { data: links } = await this.supabase
      .from('agent_workflows')
      .select('workflow_id')
      .eq('agent_id', this.agentId);

    if (!links || links.length === 0) {
      return [];
    }

    const workflowIds = links.map(link => link.workflow_id);

    const { data: workflows } = await this.supabase
      .from('workflow')
      .select('id, name, description, nodes')
      .in('id', workflowIds);

    if (!workflows) {
      return [];
    }

    return workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      triggers: this.extractTriggers(wf.name, wf.description),
      nodes: wf.nodes || []
    }));
  }

  /**
   * Extract trigger keywords from workflow name/description
   */
  private extractTriggers(name: string, description: string): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const triggers: string[] = [];

    // Onboarding triggers
    if (text.includes('onboard')) triggers.push('onboarding', 'new_employee', 'hire');
    
    // Leave triggers
    if (text.includes('leave') || text.includes('vacation')) {
      triggers.push('leave_request', 'time_off', 'vacation');
    }
    
    // Payroll triggers
    if (text.includes('payroll') || text.includes('salary')) {
      triggers.push('payroll', 'salary', 'payment');
    }
    
    // Sales triggers
    if (text.includes('lead') || text.includes('sales')) {
      triggers.push('lead_creation', 'sales', 'prospect');
    }
    
    // Support triggers
    if (text.includes('support') || text.includes('ticket')) {
      triggers.push('customer_support', 'ticket', 'issue');
    }

    return triggers;
  }

  /**
   * Determine capabilities based on skills, tools, and workflows
   */
  private determineCapabilities(
    skills: AgentSkill[],
    tools: ToolCapability[],
    workflows: WorkflowCapability[]
  ): AgentCapability[] {
    const capabilities: AgentCapability[] = [];

    // Define capability templates
    const capabilityTemplates: Omit<AgentCapability, 'isAvailable'>[] = [
      // ONBOARDING CAPABILITIES
      {
        id: 'document_driven_onboarding',
        name: 'Document-Driven Onboarding',
        description: 'Collect documents, extract data with OCR, verify, and onboard employee',
        requiredSkills: ['document_processing', 'data_extraction'],
        requiredTools: ['document_upload'],
        requiredWorkflows: ['onboarding'],
        executionPath: 'hybrid',
        metadata: {
          steps: ['request_documents', 'upload', 'ocr', 'verify', 'execute_workflow'],
          documents: ['resume', 'government_id', 'tax_form', 'i9_form', 'direct_deposit']
        }
      },
      {
        id: 'quick_onboarding',
        name: 'Quick Onboarding',
        description: 'Onboard employee with minimal information (workflow only)',
        requiredSkills: [],
        requiredTools: [],
        requiredWorkflows: ['onboarding'],
        executionPath: 'workflow',
        metadata: {
          steps: ['collect_basic_info', 'execute_workflow'],
          requiredFields: ['name', 'position', 'start_date']
        }
      },
      {
        id: 'manual_onboarding',
        name: 'Manual Onboarding Assistance',
        description: 'Guide HR through manual onboarding process',
        requiredSkills: ['conversation', 'task_comprehension'],
        requiredTools: [],
        executionPath: 'direct',
        metadata: {
          steps: ['provide_checklist', 'answer_questions', 'track_progress']
        }
      },

      // LEAVE MANAGEMENT CAPABILITIES
      {
        id: 'automated_leave_processing',
        name: 'Automated Leave Processing',
        description: 'Process leave requests with balance check and approvals',
        requiredSkills: [],
        requiredTools: [],
        requiredWorkflows: ['leave_request'],
        executionPath: 'workflow',
        metadata: {
          steps: ['check_balance', 'update_calendar', 'notify_manager', 'confirm']
        }
      },
      {
        id: 'leave_inquiry',
        name: 'Leave Balance Inquiry',
        description: 'Check leave balance and policies',
        requiredSkills: ['data_retrieval', 'conversation'],
        requiredTools: [],
        executionPath: 'direct'
      },

      // EMAIL CAPABILITIES
      {
        id: 'email_automation',
        name: 'Email Automation',
        description: 'Send, parse, and automate email workflows',
        requiredSkills: ['email_sending', 'email_parsing'],
        requiredTools: ['email_tool'],
        executionPath: 'tool'
      },

      // CRM CAPABILITIES
      {
        id: 'lead_management',
        name: 'Automated Lead Management',
        description: 'Create and manage leads in CRM',
        requiredSkills: ['lead_management'],
        requiredTools: ['crm_tool'],
        executionPath: 'tool'
      },
      {
        id: 'crm_workflow_integration',
        name: 'CRM Workflow Integration',
        description: 'Execute CRM workflows with lead creation, follow-ups, etc.',
        requiredSkills: ['lead_management'],
        requiredTools: ['crm_tool'],
        requiredWorkflows: ['lead_creation', 'sales'],
        executionPath: 'hybrid'
      }
    ];

    // Evaluate each capability template
    capabilityTemplates.forEach(template => {
      const isAvailable = this.evaluateCapability(template, skills, tools, workflows);
      
      capabilities.push({
        ...template,
        isAvailable
      });
    });

    // Return only available capabilities
    return capabilities.filter(cap => cap.isAvailable);
  }

  /**
   * Evaluate if a capability is available based on requirements
   */
  private evaluateCapability(
    template: Omit<AgentCapability, 'isAvailable'>,
    skills: AgentSkill[],
    tools: ToolCapability[],
    workflows: WorkflowCapability[]
  ): boolean {
    // Check required skills
    if (template.requiredSkills && template.requiredSkills.length > 0) {
      const hasAllSkills = template.requiredSkills.every(reqSkill =>
        skills.some(skill => skill.id === reqSkill || skill.name.toLowerCase().includes(reqSkill))
      );
      if (!hasAllSkills) {
        console.log(`❌ Capability ${template.id} missing required skills`);
        return false;
      }
    }

    // Check required tools
    if (template.requiredTools && template.requiredTools.length > 0) {
      const hasAllTools = template.requiredTools.every(reqTool =>
        tools.some(tool => tool.id === reqTool && tool.isActive)
      );
      if (!hasAllTools) {
        console.log(`❌ Capability ${template.id} missing required tools`);
        return false;
      }
    }

    // Check required workflows
    if (template.requiredWorkflows && template.requiredWorkflows.length > 0) {
      const hasAnyWorkflow = template.requiredWorkflows.some(reqWorkflow =>
        workflows.some(wf => 
          wf.triggers.includes(reqWorkflow) ||
          wf.name.toLowerCase().includes(reqWorkflow)
        )
      );
      if (!hasAnyWorkflow) {
        console.log(`❌ Capability ${template.id} missing required workflows`);
        return false;
      }
    }

    console.log(`✅ Capability ${template.id} is available`);
    return true;
  }

  /**
   * Get specific capability by ID
   */
  getCapability(capabilityId: string): AgentCapability | undefined {
    return this.capabilities.get(capabilityId);
  }

  /**
   * Get all available capabilities
   */
  getAvailableCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values()).filter(cap => cap.isAvailable);
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capabilityId: string): boolean {
    const capability = this.capabilities.get(capabilityId);
    return capability?.isAvailable ?? false;
  }

  /**
   * Find capabilities by intent/keyword
   */
  findCapabilitiesByIntent(intent: string): AgentCapability[] {
    const lowerIntent = intent.toLowerCase();
    
    return this.getAvailableCapabilities().filter(cap => {
      // Match by name or description
      if (cap.name.toLowerCase().includes(lowerIntent) ||
          cap.description.toLowerCase().includes(lowerIntent)) {
        return true;
      }

      // Match by metadata keywords
      if (cap.metadata?.steps) {
        const steps = cap.metadata.steps as string[];
        if (steps.some(step => step.includes(lowerIntent))) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Generate capability report
   */
  generateCapabilityReport(): string {
    const available = this.getAvailableCapabilities();
    
    let report = `🤖 Agent Capability Report\n\n`;
    report += `Agent ID: ${this.agentId}\n`;
    report += `Total Capabilities: ${this.capabilities.size}\n`;
    report += `Available: ${available.length}\n\n`;
    
    if (available.length > 0) {
      report += `✅ Available Capabilities:\n`;
      available.forEach(cap => {
        report += `\n  • ${cap.name}\n`;
        report += `    ${cap.description}\n`;
        report += `    Execution: ${cap.executionStrategy}\n`;
      });
    }

    const unavailable = Array.from(this.capabilities.values()).filter(cap => !cap.isAvailable);
    if (unavailable.length > 0) {
      report += `\n\n❌ Unavailable Capabilities:\n`;
      unavailable.forEach(cap => {
        report += `\n  • ${cap.name}\n`;
        report += `    Reason: Missing required tools/workflows\n`;
      });
    }

    return report;
  }

  /**
   * Discover all available tools for this agent
   */
  async discoverTools(): Promise<AgentTool[]> {
    console.log(`🔧 Discovering tools for agent ${this.agentId}...`);
    const tools: AgentTool[] = [];

    try {
      // 1. Get tools from ToolRegistry (local tools)
      const localTools = await this.getLocalTools();
      tools.push(...localTools);

      // 2. Get API integration tools
      const apiTools = await this.getAPITools();
      tools.push(...apiTools);

      console.log(`✅ Discovered ${tools.length} tools`);
      return tools;

    } catch (error) {
      console.error('Error discovering tools:', error);
      return tools;
    }
  }

  /**
   * Get local tools from ToolRegistry
   */
  private async getLocalTools(): Promise<AgentTool[]> {
    const registryTools = toolRegistry.getActiveTools();
    
    return registryTools.map(tool => ({
      id: tool.name.toLowerCase().replace(/\s+/g, '_'),
      name: tool.name,
      description: tool.description,
      type: 'local' as const,
      functions: tool.skills.map(skill => ({
        id: skill.name,
        name: skill.name,
        description: skill.description,
        type: 'local' as const,
        implementation: skill.name,
        parameters: [],
        requiresAuth: false
      })),
      isAvailable: true,
      lastChecked: new Date()
    }));
  }

  /**
   * Get API integration tools
   */
  private async getAPITools(): Promise<AgentTool[]> {
    const tools: AgentTool[] = [];

    // Check which API integrations are configured
    const hasGoogle = !!import.meta.env.VITE_GOOGLE_API_KEY;
    const hasSalesforce = !!import.meta.env.VITE_SALESFORCE_API_KEY;
    const hasAWS = !!import.meta.env.VITE_AWS_ACCESS_KEY;

    if (hasGoogle) {
      tools.push({
        id: 'google_workspace',
        name: 'Google Workspace',
        description: 'Google Workspace integration (Gmail, Calendar, Drive)',
        type: 'integration',
        provider: 'google',
        functions: [
          {
            id: 'create_email_account',
            name: 'create_email_account',
            description: 'Create new Gmail account',
            type: 'api',
            apiEndpoint: 'https://admin.googleapis.com/admin/directory/v1/users',
            apiMethod: 'POST',
            parameters: [
              { name: 'firstName', type: 'string', description: 'First name', required: true },
              { name: 'lastName', type: 'string', description: 'Last name', required: true }
            ],
            requiresAuth: true
          },
          {
            id: 'create_calendar_event',
            name: 'create_calendar_event',
            description: 'Create calendar event',
            type: 'api',
            apiEndpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            apiMethod: 'POST',
            requiresAuth: true
          }
        ],
        isAvailable: true
      });
    }

    if (hasSalesforce) {
      tools.push({
        id: 'salesforce',
        name: 'Salesforce CRM',
        description: 'Salesforce CRM integration',
        type: 'integration',
        provider: 'salesforce',
        functions: [
          {
            id: 'create_lead',
            name: 'create_lead',
            description: 'Create new lead in Salesforce',
            type: 'api',
            apiEndpoint: '/services/data/v58.0/sobjects/Lead',
            apiMethod: 'POST',
            requiresAuth: true
          }
        ],
        isAvailable: true
      });
    }

    return tools;
  }

  /**
   * Map skills to capabilities to tools to functions
   * This creates the complete hierarchy
   */
  mapSkillHierarchy(
    skills: AgentSkill[],
    tools: AgentTool[]
  ): AgentSkill[] {
    return skills.map(skill => {
      // If skill already has capabilities defined, return as-is
      if (skill.capabilities && skill.capabilities.length > 0) {
        return skill;
      }

      // Auto-generate capabilities from skill name
      const capabilities = this.generateCapabilitiesForSkill(skill, tools);

      return {
        ...skill,
        capabilities
      };
    });
  }

  /**
   * Generate capabilities for a skill based on available tools
   */
  private generateCapabilitiesForSkill(
    skill: AgentSkill,
    tools: AgentTool[]
  ): AgentCapability[] {
    const capabilities: AgentCapability[] = [];
    const skillName = skill.name.toLowerCase();

    // Document processing skill
    if (skillName.includes('document')) {
      const ocrTool = tools.find(t => t.id.includes('ocr') || t.name.includes('OCR'));
      if (ocrTool) {
        capabilities.push({
          id: `${skill.name}_ocr`,
          name: 'Document OCR Processing',
          description: 'Extract text from documents using OCR',
          requiredTools: [ocrTool.id],
          executionStrategy: 'direct',
          isAvailable: true
        });
      }
    }

    // Email skill
    if (skillName.includes('email')) {
      const emailTool = tools.find(t => t.id === 'email_tool');
      if (emailTool) {
        capabilities.push({
          id: `${skill.name}_automation`,
          name: 'Email Automation',
          description: 'Automate email operations',
          requiredTools: [emailTool.id],
          executionStrategy: 'tool',
          isAvailable: true
        });
      }
    }

    // CRM skill
    if (skillName.includes('lead') || skillName.includes('crm')) {
      const crmTool = tools.find(t => t.id === 'salesforce' || t.id === 'crm_tool');
      if (crmTool) {
        capabilities.push({
          id: `${skill.name}_management`,
          name: 'CRM Operations',
          description: 'Manage CRM data and operations',
          requiredTools: [crmTool.id],
          executionStrategy: 'tool',
          isAvailable: true
        });
      }
    }

    return capabilities;
  }
}

