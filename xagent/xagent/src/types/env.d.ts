/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_OPENAI_ORG_ID: string;
  readonly VITE_PINECONE_API_KEY: string;
  readonly VITE_PINECONE_ENVIRONMENT: string;
  readonly VITE_PINECONE_INDEX_NAME: string;
  readonly VITE_NEO4J_URI: string;
  readonly VITE_NEO4J_USER: string;
  readonly VITE_NEO4J_PASSWORD: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
}