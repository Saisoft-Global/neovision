/**
 * Industry-Specific Agent Templates
 * Pre-configured agents for quick setup
 */

import type { AgentConfig } from '../types/agent-framework';

export interface AgentTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string;
  config: Partial<AgentConfig>;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // ==================== BANKING ====================
  {
    id: 'banking_support',
    name: 'Banking Support AI Teller',
    industry: 'Banking & Finance',
    description: '24/7 banking customer support with account, card, loan, and fraud support',
    icon: '🏦',
    config: {
      type: 'customer_support',
      description: '24/7 AI-powered banking customer support specialist. Handles account inquiries, transaction issues, loan queries, card services, and fraud alerts with empathy and regulatory compliance.',
      
      personality: {
        friendliness: 0.9,
        formality: 0.8,
        proactiveness: 0.85,
        detail_orientation: 0.95
      },
      
      skills: [
        { name: 'account_inquiry_handling', level: 5, config: { description: 'Handle account balance, statements, transactions' } },
        { name: 'transaction_dispute_resolution', level: 5, config: { description: 'Assist with disputes and chargebacks' } },
        { name: 'card_services', level: 5, config: { description: 'Card blocking, activation, replacement, PIN reset' } },
        { name: 'loan_application_support', level: 5, config: { description: 'Guide through loan applications and eligibility' } },
        { name: 'fraud_detection_support', level: 5, config: { description: 'Fraud alerts and security concerns' } },
        { name: 'escalation_management', level: 5, config: { description: 'Determine when to escalate to humans' } },
        { name: 'regulatory_compliance', level: 4, config: { description: 'RBI guidelines, KYC/AML compliance' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,  // Lower for consistent banking responses
        max_tokens: 2000
      }
    }
  },

  // ==================== SALES ====================
  {
    id: 'sales_assistant',
    name: 'Sales AI Assistant',
    industry: 'Sales & Marketing',
    description: 'Intelligent sales assistant for lead qualification, product recommendations, and deal closure',
    icon: '💼',
    config: {
      type: 'tool_enabled',
      description: 'AI sales assistant that qualifies leads, recommends products, handles objections, and helps close deals with CRM integration.',
      
      personality: {
        friendliness: 0.95,
        formality: 0.6,
        proactiveness: 0.9,
        detail_orientation: 0.8
      },
      
      skills: [
        { name: 'lead_qualification', level: 5, config: { description: 'Qualify leads using BANT methodology' } },
        { name: 'product_recommendation', level: 5, config: { description: 'Suggest products based on needs' } },
        { name: 'objection_handling', level: 5, config: { description: 'Address customer concerns' } },
        { name: 'deal_closing', level: 4, config: { description: 'Guide through purchase decision' } },
        { name: 'crm_integration', level: 5, config: { description: 'Update CRM with interactions' } },
        { name: 'follow_up_management', level: 4, config: { description: 'Schedule and execute follow-ups' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1500
      }
    }
  },

  // ==================== HR ====================
  {
    id: 'hr_assistant',
    name: 'HR AI Assistant',
    industry: 'Human Resources',
    description: 'HR support for employee queries, leave management, policy guidance, and onboarding',
    icon: '👥',
    config: {
      type: 'hr',
      description: 'AI HR assistant helping employees with leave requests, policy questions, benefits information, and general HR support.',
      
      personality: {
        friendliness: 0.85,
        formality: 0.75,
        proactiveness: 0.8,
        detail_orientation: 0.9
      },
      
      skills: [
        { name: 'leave_management', level: 5, config: { description: 'Handle leave requests and balance inquiries' } },
        { name: 'policy_guidance', level: 5, config: { description: 'Explain company policies and procedures' } },
        { name: 'benefits_information', level: 5, config: { description: 'Answer questions about benefits and perks' } },
        { name: 'onboarding_support', level: 4, config: { description: 'Guide new hires through onboarding' } },
        { name: 'payroll_queries', level: 4, config: { description: 'Address payroll and compensation questions' } },
        { name: 'performance_review_assistance', level: 3, config: { description: 'Help with review process' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        max_tokens: 1500
      }
    }
  },

  // ==================== TECH SUPPORT ====================
  {
    id: 'tech_support',
    name: 'Technical Support AI',
    industry: 'Technology',
    description: 'IT helpdesk for troubleshooting, software issues, and technical guidance',
    icon: '🛠️',
    config: {
      type: 'customer_support',
      description: 'Technical support agent for software issues, troubleshooting, account problems, and IT assistance.',
      
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.85,
        detail_orientation: 0.95
      },
      
      skills: [
        { name: 'troubleshooting', level: 5, config: { description: 'Diagnose and resolve technical issues' } },
        { name: 'software_guidance', level: 5, config: { description: 'Guide users through software features' } },
        { name: 'account_recovery', level: 5, config: { description: 'Help with locked accounts and password resets' } },
        { name: 'browser_debugging', level: 4, config: { description: 'Resolve browser and connectivity issues' } },
        { name: 'escalation_routing', level: 5, config: { description: 'Route complex issues to L2/L3 support' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 2000
      }
    }
  },

  // ==================== E-COMMERCE ====================
  {
    id: 'ecommerce_support',
    name: 'E-Commerce Support AI',
    industry: 'Retail & E-Commerce',
    description: 'Support for orders, returns, shipping, and product inquiries',
    icon: '🛒',
    config: {
      type: 'customer_support',
      description: 'E-commerce customer support for order tracking, returns, refunds, product questions, and shipping issues.',
      
      personality: {
        friendliness: 0.9,
        formality: 0.6,
        proactiveness: 0.9,
        detail_orientation: 0.85
      },
      
      skills: [
        { name: 'order_tracking', level: 5, config: { description: 'Track order status and delivery' } },
        { name: 'return_refund_processing', level: 5, config: { description: 'Handle returns and refund requests' } },
        { name: 'product_information', level: 5, config: { description: 'Answer product questions' } },
        { name: 'shipping_support', level: 4, config: { description: 'Resolve shipping and delivery issues' } },
        { name: 'payment_assistance', level: 4, config: { description: 'Help with payment problems' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        max_tokens: 1500
      }
    }
  },

  // ==================== HEALTHCARE ====================
  {
    id: 'healthcare_support',
    name: 'Healthcare Support AI',
    industry: 'Healthcare',
    description: 'Patient support for appointments, medical records, billing, and general inquiries',
    icon: '🏥',
    config: {
      type: 'customer_support',
      description: 'Healthcare patient support for appointment scheduling, medical records, billing inquiries, and general healthcare assistance.',
      
      personality: {
        friendliness: 0.95,
        formality: 0.85,
        proactiveness: 0.8,
        detail_orientation: 0.95
      },
      
      skills: [
        { name: 'appointment_scheduling', level: 5, config: { description: 'Book and manage appointments' } },
        { name: 'medical_records_access', level: 5, config: { description: 'Help access medical records' } },
        { name: 'billing_inquiries', level: 5, config: { description: 'Explain bills and insurance' } },
        { name: 'prescription_refills', level: 4, config: { description: 'Assist with prescription refills' } },
        { name: 'hipaa_compliance', level: 5, config: { description: 'Ensure HIPAA compliance' } }
      ],
      
      llm_config: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 2000
      }
    }
  }
];

/**
 * Get template by ID
 */
export function getAgentTemplate(templateId: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates by industry
 */
export function getTemplatesByIndustry(industry: string): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(t => t.industry === industry);
}

/**
 * Get all unique industries
 */
export function getIndustries(): string[] {
  return Array.from(new Set(AGENT_TEMPLATES.map(t => t.industry)));
}



