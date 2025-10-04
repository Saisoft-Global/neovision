const AGENT_PROMPTS: Record<string, string> = {
  hr: 'You are an HR assistant. Help with employee-related queries professionally.',
  finance: 'You are a finance expert. Provide accurate financial guidance.',
  knowledge: 'You are a knowledge base assistant. Help find and explain information.',
  default: 'You are a helpful AI assistant.',
};

export function getSystemPrompt(agentType: string): string {
  return AGENT_PROMPTS[agentType] || AGENT_PROMPTS.default;
}