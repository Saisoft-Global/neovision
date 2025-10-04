import { supabase } from '../../config/supabase';
import { generateEmbeddings } from '../openai/embeddings';
import { createChatCompletion } from '../openai/chat';

export class RAGService {
  private static instance: RAGService;

  private constructor() {}

  public static getInstance(): RAGService {
    if (!this.instance) {
      this.instance = new RAGService();
    }
    return this.instance;
  }

  async search(query: string, options: { limit?: number; filters?: any } = {}): Promise<any[]> {
    const queryEmbeddings = await generateEmbeddings(query);
    
    const { data: chunks, error } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbeddings,
        match_threshold: 0.7,
        match_count: options.limit || 5,
      });

    if (error) throw error;
    return chunks;
  }

  async generateResponse(query: string, context?: string): Promise<string> {
    // Retrieve relevant documents
    const relevantChunks = await this.search(query);
    const context = relevantChunks.map(chunk => chunk.content).join('\n\n');

    // Generate response using context
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the provided context to answer questions accurately.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ]);

    return response?.choices[0]?.message?.content || '';
  }
}