// Environment configuration
export const isServiceConfigured = (service: string) => {
  switch (service) {
    case 'supabase':
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      return !!(supabaseUrl && supabaseKey && supabaseUrl.includes('supabase.co'));
    case 'openai':
      return !!import.meta.env.VITE_OPENAI_API_KEY;
    case 'pinecone':
      return !!(import.meta.env.VITE_PINECONE_API_KEY && import.meta.env.VITE_PINECONE_INDEX_NAME);
    case 'groq':
      return !!import.meta.env.VITE_GROQ_API_KEY;
    default:
      console.warn(`Unknown service: ${service}`);
      return false;
  }
};