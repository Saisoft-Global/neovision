export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  dangerouslyAllowBrowser: boolean;
}

export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const orgId = import.meta.env.VITE_OPENAI_ORG_ID;

  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const config: OpenAIConfig = {
    apiKey,
    dangerouslyAllowBrowser: true,
  };

  // Only include organization if it's a valid value
  if (orgId && orgId !== 'your_openai_org_id_here') {
    config.organization = orgId;
  }

  return config;
}