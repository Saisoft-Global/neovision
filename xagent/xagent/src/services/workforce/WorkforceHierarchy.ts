/**
 * Pre-built Workforce Hierarchy
 * Defines standard organizational structure with AI agents at each level
 */

import { WorkforceAgent, WorkforceLevel, EscalationRule, EscalationReason } from './HierarchicalWorkforceManager';

// Pre-defined escalation rules
export const STANDARD_ESCALATION_RULES: EscalationRule[] = [
  // Worker level escalation rules
  {
    condition: '{task.complexity} > 3',
    reason: EscalationReason.COMPLEXITY_EXCEEDED,
    targetLevel: WorkforceLevel.MANAGER,
    humanRequired: false,
    priority: 'medium',
    autoApprove: true
  },
  {
    condition: '{task.confidence} < 0.7',
    reason: EscalationReason.CONFIDENCE_THRESHOLD,
    targetLevel: WorkforceLevel.MANAGER,
    humanRequired: false,
    priority: 'medium',
    autoApprove: true
  },
  {
    condition: '{task.priority} === "critical"',
    reason: EscalationReason.STRATEGIC_DECISION,
    targetLevel: WorkforceLevel.HUMAN,
    humanRequired: true,
    priority: 'critical',
    autoApprove: false
  },

  // Manager level escalation rules
  {
    condition: '{task.complexity} > 6',
    reason: EscalationReason.COMPLEXITY_EXCEEDED,
    targetLevel: WorkforceLevel.DIRECTOR,
    humanRequired: false,
    priority: 'high',
    autoApprove: true
  },
  {
    condition: '{task.riskLevel} === "high"',
    reason: EscalationReason.POLICY_VIOLATION,
    targetLevel: WorkforceLevel.DIRECTOR,
    humanRequired: false,
    priority: 'high',
    autoApprove: false
  },
  {
    condition: '{task.budget} > 5000',
    reason: EscalationReason.STRATEGIC_DECISION,
    targetLevel: WorkforceLevel.HUMAN,
    humanRequired: true,
    priority: 'high',
    autoApprove: false
  },

  // Director level escalation rules
  {
    condition: '{task.complexity} > 8',
    reason: EscalationReason.COMPLEXITY_EXCEEDED,
    targetLevel: WorkforceLevel.HUMAN,
    humanRequired: true,
    priority: 'critical',
    autoApprove: false
  },
  {
    condition: '{task.type}.includes("strategic")',
    reason: EscalationReason.STRATEGIC_DECISION,
    targetLevel: WorkforceLevel.HUMAN,
    humanRequired: true,
    priority: 'critical',
    autoApprove: false
  }
];

// Pre-defined workforce agents
export const STANDARD_WORKFORCE: WorkforceAgent[] = [
  // AI WORKER LAYER
  {
    id: 'ai-customer-support-worker',
    name: 'AI Customer Support Worker',
    level: WorkforceLevel.WORKER,
    department: 'Customer Service',
    capabilities: [
      'ticket_resolution',
      'faq_handling',
      'basic_troubleshooting',
      'email_response',
      'chat_support'
    ],
    confidenceThreshold: 0.7,
    maxComplexity: 3,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.MANAGER
    ),
    aiSupervisor: 'ai-customer-support-manager'
  },
  {
    id: 'ai-data-entry-worker',
    name: 'AI Data Entry Worker',
    level: WorkforceLevel.WORKER,
    department: 'Operations',
    capabilities: [
      'document_processing',
      'data_validation',
      'form_filling',
      'data_extraction',
      'quality_checking'
    ],
    confidenceThreshold: 0.8,
    maxComplexity: 2,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.MANAGER
    ),
    aiSupervisor: 'ai-operations-manager'
  },
  {
    id: 'ai-research-worker',
    name: 'AI Research Worker',
    level: WorkforceLevel.WORKER,
    department: 'Research',
    capabilities: [
      'information_gathering',
      'data_analysis',
      'report_generation',
      'trend_analysis',
      'competitor_research'
    ],
    confidenceThreshold: 0.75,
    maxComplexity: 4,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.MANAGER
    ),
    aiSupervisor: 'ai-research-manager'
  },
  {
    id: 'ai-communication-worker',
    name: 'AI Communication Worker',
    level: WorkforceLevel.WORKER,
    department: 'Communications',
    capabilities: [
      'email_management',
      'scheduling',
      'meeting_coordination',
      'notification_sending',
      'content_creation'
    ],
    confidenceThreshold: 0.8,
    maxComplexity: 3,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.MANAGER
    ),
    aiSupervisor: 'ai-communications-manager'
  },

  // AI MANAGER LAYER
  {
    id: 'ai-customer-support-manager',
    name: 'AI Customer Support Manager',
    level: WorkforceLevel.MANAGER,
    department: 'Customer Service',
    capabilities: [
      'team_coordination',
      'escalation_handling',
      'policy_interpretation',
      'quality_assurance',
      'performance_monitoring',
      'complex_troubleshooting',
      'customer_retention'
    ],
    confidenceThreshold: 0.8,
    maxComplexity: 6,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.DIRECTOR || rule.targetLevel === WorkforceLevel.HUMAN
    ),
    aiSupervisor: 'ai-customer-director',
    humanSupervisor: 'human-customer-director'
  },
  {
    id: 'ai-operations-manager',
    name: 'AI Operations Manager',
    level: WorkforceLevel.MANAGER,
    department: 'Operations',
    capabilities: [
      'process_optimization',
      'resource_allocation',
      'workflow_management',
      'quality_control',
      'performance_analysis',
      'vendor_management',
      'cost_optimization'
    ],
    confidenceThreshold: 0.8,
    maxComplexity: 6,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.DIRECTOR || rule.targetLevel === WorkforceLevel.HUMAN
    ),
    aiSupervisor: 'ai-operations-director',
    humanSupervisor: 'human-operations-director'
  },
  {
    id: 'ai-hr-manager',
    name: 'AI HR Manager',
    level: WorkforceLevel.MANAGER,
    department: 'Human Resources',
    capabilities: [
      'employee_lifecycle',
      'policy_interpretation',
      'performance_reviews',
      'recruitment_support',
      'training_coordination',
      'compliance_monitoring',
      'conflict_resolution'
    ],
    confidenceThreshold: 0.75,
    maxComplexity: 7,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.DIRECTOR || rule.targetLevel === WorkforceLevel.HUMAN
    ),
    aiSupervisor: 'ai-hr-director',
    humanSupervisor: 'human-hr-director'
  },
  {
    id: 'ai-finance-manager',
    name: 'AI Finance Manager',
    level: WorkforceLevel.MANAGER,
    department: 'Finance',
    capabilities: [
      'budget_management',
      'financial_analysis',
      'expense_approval',
      'reporting',
      'cost_analysis',
      'forecasting',
      'compliance_monitoring'
    ],
    confidenceThreshold: 0.85,
    maxComplexity: 6,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.DIRECTOR || rule.targetLevel === WorkforceLevel.HUMAN
    ),
    aiSupervisor: 'ai-finance-director',
    humanSupervisor: 'human-finance-director'
  },

  // AI DIRECTOR LAYER
  {
    id: 'ai-customer-director',
    name: 'AI Customer Experience Director',
    level: WorkforceLevel.DIRECTOR,
    department: 'Customer Service',
    capabilities: [
      'strategic_planning',
      'multi_department_coordination',
      'policy_development',
      'crisis_management',
      'stakeholder_management',
      'innovation_leadership',
      'performance_optimization'
    ],
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.HUMAN
    ),
    humanSupervisor: 'human-customer-director'
  },
  {
    id: 'ai-operations-director',
    name: 'AI Operations Director',
    level: WorkforceLevel.DIRECTOR,
    department: 'Operations',
    capabilities: [
      'operational_strategy',
      'cross_functional_coordination',
      'technology_roadmap',
      'risk_management',
      'vendor_strategy',
      'efficiency_optimization',
      'scalability_planning'
    ],
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.HUMAN
    ),
    humanSupervisor: 'human-operations-director'
  },
  {
    id: 'ai-hr-director',
    name: 'AI Human Resources Director',
    level: WorkforceLevel.DIRECTOR,
    department: 'Human Resources',
    capabilities: [
      'hr_strategy',
      'organizational_development',
      'talent_management',
      'culture_development',
      'compliance_strategy',
      'diversity_initiatives',
      'employee_engagement'
    ],
    confidenceThreshold: 0.85,
    maxComplexity: 8,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.HUMAN
    ),
    humanSupervisor: 'human-hr-director'
  },
  {
    id: 'ai-finance-director',
    name: 'AI Finance Director',
    level: WorkforceLevel.DIRECTOR,
    department: 'Finance',
    capabilities: [
      'financial_strategy',
      'investment_planning',
      'risk_assessment',
      'compliance_strategy',
      'financial_modeling',
      'stakeholder_reporting',
      'cost_optimization'
    ],
    confidenceThreshold: 0.9,
    maxComplexity: 8,
    escalationRules: STANDARD_ESCALATION_RULES.filter(rule => 
      rule.targetLevel === WorkforceLevel.HUMAN
    ),
    humanSupervisor: 'human-finance-director'
  }
];

// Department-specific workforce configurations
export const DEPARTMENT_WORKFORCES = {
  'Customer Service': [
    'ai-customer-support-worker',
    'ai-customer-support-manager',
    'ai-customer-director'
  ],
  'Operations': [
    'ai-data-entry-worker',
    'ai-operations-manager',
    'ai-operations-director'
  ],
  'Human Resources': [
    'ai-hr-manager',
    'ai-hr-director'
  ],
  'Finance': [
    'ai-finance-manager',
    'ai-finance-director'
  ],
  'Research': [
    'ai-research-worker'
  ],
  'Communications': [
    'ai-communication-worker'
  ]
};

// Initialize workforce hierarchy
export function initializeWorkforceHierarchy(): void {
  const workforceManager = require('./HierarchicalWorkforceManager').hierarchicalWorkforceManager;
  
  // Register all standard workforce agents
  STANDARD_WORKFORCE.forEach(agent => {
    workforceManager.registerAgent(agent);
  });
  
  console.log(`🏢 Initialized workforce hierarchy with ${STANDARD_WORKFORCE.length} AI agents`);
  console.log(`📊 Workforce distribution:`);
  console.log(`   👷 Workers: ${STANDARD_WORKFORCE.filter(a => a.level === WorkforceLevel.WORKER).length}`);
  console.log(`   👔 Managers: ${STANDARD_WORKFORCE.filter(a => a.level === WorkforceLevel.MANAGER).length}`);
  console.log(`   🎯 Directors: ${STANDARD_WORKFORCE.filter(a => a.level === WorkforceLevel.DIRECTOR).length}`);
}


