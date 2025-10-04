import { generateEmbeddings as openAIEmbeddings } from '../../openai/embeddings';
import { generateCompletion as ollamaCompletion } from '../../llm/providers/ollama';

export class FallbackEmbedding {
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Try OpenAI first
      return await openAIEmbeddings(text);
    } catch (error) {
      console.warn('OpenAI embeddings failed, falling back to Ollama:', error);
      
      try {
        // Fallback to Ollama
        const response = await ollamaCompletion(
          [{ role: 'user', content: text }],
          'llama2',
          0.7
        );
        
        // Convert text to simple numeric representation
        // This is a simplified fallback - not as good as proper embeddings
        return this.textToVector(response.content);
      } catch (fallbackError) {
        console.error('Fallback embeddings failed:', fallbackError);
        throw new Error('All embedding providers failed');
      }
    }
  }

  private textToVector(text: string): number[] {
    // Simple fallback: convert text to numeric vector
    // This is NOT a production-ready embedding solution!
    const vector: number[] = new Array(1536).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (let i = 0; i < normalized.length && i < vector.length; i++) {
      vector[i] = normalized.charCodeAt(i) / 255; // Normalize to 0-1
    }
    
    return vector;
  }
}