import type { AgentConfig } from '../../../types/agent-framework';

export interface AgentTemplate {
  type: string;
  name: string;
  description: string;
  config: AgentConfig;
  preloadedKnowledge: string[];
  defaultWorkflows: string[];
}

export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  hr_assistant: {
    type: 'hr',
    name: 'HR Assistant',
    description: 'Handles employee queries and HR-related tasks',
    config: {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [
        { name: 'employee_onboarding', level: 5 },
        { name: 'payroll_processing', level: 4 },
        { name: 'policy_guidance', level: 5 },
      ],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    },
    preloadedKnowledge: [
      'hr_policies',
      'employee_handbook',
      'benefits_guide',
    ],
    defaultWorkflows: [
      'onboarding_workflow',
      'leave_request_workflow',
      'payroll_workflow',
    ],
  },
  finance_analyst: {
    type: 'finance',
    name: 'Finance Analyst',
    description: 'Processes financial data and generates reports',
    config: {
      personality: {
        friendliness: 0.6,
        formality: 0.9,
        proactiveness: 0.7,
        detail_orientation: 1.0,
      },
      skills: [
        { name: 'financial_analysis', level: 5 },
        { name: 'report_generation', level: 5 },
        { name: 'expense_tracking', level: 4 },
      ],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
      },
    },
    preloadedKnowledge: [
      'accounting_standards',
      'financial_regulations',
      'reporting_templates',
    ],
    defaultWorkflows: [
      'expense_approval_workflow',
      'report_generation_workflow',
      'audit_workflow',
    ],
  },
  customer_support: {
    type: 'support',
    name: 'Customer Support Agent',
    description: 'Provides customer assistance and resolves queries',
    config: {
      personality: {
        friendliness: 1.0,
        formality: 0.6,
        proactiveness: 0.8,
        detail_orientation: 0.7,
      },
      skills: [
        { name: 'ticket_management', level: 5 },
        { name: 'customer_communication', level: 5 },
        { name: 'problem_resolution', level: 4 },
      ],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    },
    preloadedKnowledge: [
      'product_documentation',
      'faq_database',
      'troubleshooting_guides',
    ],
    defaultWorkflows: [
      'ticket_resolution_workflow',
      'escalation_workflow',
      'feedback_collection_workflow',
    ],
  },
};