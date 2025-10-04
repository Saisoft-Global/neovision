import type { Agent } from '../../../types/agent';
import { KnowledgeService } from '../../knowledge/KnowledgeService';

export async function getAgentContext(agent: Agent, query: string) {
  const knowledgeService = KnowledgeService.getInstance();
  let relevantKnowledge: any[] = [];

  try {
    if (knowledgeService.isInitialized()) {
      relevantKnowledge = await knowledgeService.queryKnowledge(query);
    }
  } catch (error) {
    console.error('Failed to get relevant knowledge:', error);
    // Continue without knowledge context
  }

  return {
    agentExpertise: agent.expertise,
    personality: agent.personality,
    domainKnowledge: relevantKnowledge,
    capabilities: getAgentCapabilities(agent.type)
  };
}

function getAgentCapabilities(type: string): string[] {
  const capabilities: Record<string, string[]> = {
    hr: [
      'policy_lookup',
      'employee_data_access',
      'benefit_calculation',
      'performance_review'
    ],
    finance: [
      'financial_analysis',
      'investment_recommendation',
      'risk_assessment',
      'tax_calculation'
    ],
    technical: [
      'code_review',
      'architecture_design',
      'debugging',
      'security_assessment'
    ]
  };

  return capabilities[type] || [];
}