import { z } from 'zod';

export const PineconeConfigSchema = z.object({
  apiKey: z.string().min(1, 'Pinecone API key is required'),
  environment: z.string().min(1, 'Pinecone environment is required'),
  indexName: z.string().min(1, 'Pinecone index name is required'),
});

export type PineconeConfig = z.infer<typeof PineconeConfigSchema>;

export function getPineconeConfig(): PineconeConfig {
  const apiKey = import.meta.env.VITE_PINECONE_API_KEY;
  const environment = import.meta.env.VITE_PINECONE_ENVIRONMENT;
  const indexName = import.meta.env.VITE_PINECONE_INDEX_NAME;

  const config = PineconeConfigSchema.safeParse({
    apiKey,
    environment,
    indexName,
  });

  if (!config.success) {
    throw new Error(
      'Invalid Pinecone configuration: ' + 
      config.error.issues.map(i => i.message).join(', ')
    );
  }

  return config.data;
}