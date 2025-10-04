import { z } from 'zod';

// Define service configurations with required fields
const supabaseConfig = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

const openAIConfig = z.object({
  VITE_OPENAI_API_KEY: z.string().min(1),
  VITE_OPENAI_ORG_ID: z.string().optional(),
});

const pineconeConfig = z.object({
  VITE_PINECONE_API_KEY: z.string().min(1),
  VITE_PINECONE_ENVIRONMENT: z.string().min(1),
  VITE_PINECONE_INDEX_NAME: z.string().min(1),
}).partial();

// Combine all configurations
const envSchema = z.object({
  ...supabaseConfig.shape,
  ...openAIConfig.shape,
  ...pineconeConfig.shape,
});

export type Env = z.infer<typeof envSchema>;

export function getEnvConfig(): Env {
  const config = envSchema.safeParse(import.meta.env);
  
  if (!config.success) {
    throw new Error(
      'Invalid environment configuration: ' + 
      config.error.issues.map(i => i.message).join(', ')
    );
  }
  
  return config.data;
}

export function isServiceConfigured(service: 'supabase' | 'openai' | 'pinecone'): boolean {
  try {
    const env = import.meta.env;
    
    switch (service) {
      case 'supabase':
        return Boolean(
          env.VITE_SUPABASE_URL && 
          env.VITE_SUPABASE_ANON_KEY &&
          env.VITE_SUPABASE_URL.startsWith('https://') &&
          env.VITE_SUPABASE_ANON_KEY.length > 20
        );
      case 'openai':
        return Boolean(
          env.VITE_OPENAI_API_KEY?.length > 20 &&
          (!env.VITE_OPENAI_ORG_ID || env.VITE_OPENAI_ORG_ID !== 'your_openai_org_id_here')
        );
      case 'pinecone':
        return Boolean(
          env.VITE_PINECONE_API_KEY &&
          env.VITE_PINECONE_ENVIRONMENT &&
          env.VITE_PINECONE_INDEX_NAME
        );
      default:
        return false;
    }
  } catch {
    return false;
  }
}