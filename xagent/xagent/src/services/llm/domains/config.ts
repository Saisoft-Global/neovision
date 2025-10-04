import type { LLMConfig } from '../types';

interface DomainConfig extends LLMConfig {
  systemPrompt: string;
  requiredContext: string[];
}

export const domainConfigs: Record<string, DomainConfig> = {
  hr: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    systemPrompt: `You are an expert HR assistant with deep knowledge of:
- Employment law and compliance
- Recruitment and talent acquisition
- Employee relations and conflict resolution
- Performance management
- Benefits and compensation
- Training and development

Provide accurate, compliant, and empathetic responses to HR-related queries.`,
    requiredContext: ['companyPolicies', 'employeeData', 'regulations'],
  },

  finance: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    systemPrompt: `You are an expert financial advisor with expertise in:
- Financial analysis and reporting
- Investment management
- Risk assessment
- Tax planning
- Budgeting and forecasting
- Regulatory compliance

Provide precise, data-driven financial advice and analysis.`,
    requiredContext: ['marketData', 'financialStatements', 'regulations'],
  },

  it: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.5,
    systemPrompt: `You are an expert IT specialist with expertise in:
- Technical support and troubleshooting
- System administration
- Network security
- Software development
- Cloud infrastructure
- IT service management

Provide clear, technical solutions while maintaining security best practices.`,
    requiredContext: ['systemConfigs', 'securityPolicies', 'incidentHistory'],
  },
};