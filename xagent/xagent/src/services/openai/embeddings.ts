// OpenAI embeddings service using backend proxy
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, generating mock embeddings');
    // Generate a mock embedding vector (1536 dimensions like OpenAI)
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  try {
    console.log('🔍 [EMBEDDINGS] Starting request to:', `${BACKEND_URL}/api/openai/embeddings`);
    console.log('🔍 [EMBEDDINGS] Request payload:', { input: text, model: 'text-embedding-ada-002' });
    
    // Lightweight client-side retry for transient 5xx/504
    const maxAttempts = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(`${BACKEND_URL}/api/openai/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002'
        })
      });

      console.log('🔍 [EMBEDDINGS] Response status:', response.status);
      console.log('🔍 [EMBEDDINGS] Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [EMBEDDINGS] Success! Got embedding with', data.data[0].embedding.length, 'dimensions');
        return data.data[0].embedding;
      }

      const errorText = await response.text();
      console.error(`🔍 [EMBEDDINGS] Attempt ${attempt} failed:`, response.status, errorText);
      lastError = new Error(`OpenAI API error: ${response.status} ${response.statusText}`);

      // Retry on likely transient issues
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 400));
        continue;
      }

      throw lastError;
    }

    // Exhausted retries
    throw lastError || new Error('Unknown embeddings error');
  } catch (error) {
    console.error('OpenAI embeddings failed:', error);
    // Fallback to mock embeddings
    console.warn('Falling back to mock embeddings');
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }
};

export const generateEmbeddingsBatch = async (texts: string[]): Promise<number[][]> => {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, generating mock embeddings for batch');
    return texts.map(() => new Array(1536).fill(0).map(() => Math.random() * 2 - 1));
  }

  try {
    const maxAttempts = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(`${BACKEND_URL}/api/openai/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: 'text-embedding-ada-002'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.map((item: any) => item.embedding);
      }

      lastError = new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 400));
        continue;
      }

      throw lastError;
    }
    throw lastError || new Error('Unknown batch embeddings error');
  } catch (error) {
    console.error('OpenAI batch embeddings failed:', error);
    // Fallback to mock embeddings
    console.warn('Falling back to mock embeddings for batch');
    return texts.map(() => new Array(1536).fill(0).map(() => Math.random() * 2 - 1));
  }
};

export const isOpenAIAvailable = (): boolean => {
  return !!OPENAI_API_KEY;
};
