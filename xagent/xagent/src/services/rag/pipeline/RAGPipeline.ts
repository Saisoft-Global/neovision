import { generateEmbeddings } from '../../openai/embeddings';
import { getVectorStore } from '../../pinecone/client';
import { createChatCompletion } from '../../openai/chat';
import { ContextualWeightEngine } from '../ContextualWeightEngine';
import type { Document } from '../../../types/document';

export class RAGPipeline {
  private weightEngine: ContextualWeightEngine;
  private maxContextLength = 4000; // Adjust based on model context window

  constructor() {
    this.weightEngine = new ContextualWeightEngine();
  }

  async processQuery(query: string): Promise<{
    answer: string;
    sources: Document[];
  }> {
    try {
      // Generate embeddings for query
      const queryEmbeddings = await generateEmbeddings(query);

      // Get vector store
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }

      // Retrieve relevant documents
      const results = await vectorStore.query({
        vector: queryEmbeddings,
        topK: 5,
        includeMetadata: true,
      });

      // Weight and filter documents
      const weightedDocs = await this.weightEngine.weightDocuments(
        query,
        results.matches.map(match => match.metadata as Document)
      );

      // Build context from weighted documents
      const context = this.buildContext(weightedDocs);

      // Generate response using context
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `You are a helpful assistant. Use the following context to answer questions accurately:\n\n${context}`,
        },
        { role: 'user', content: query },
      ]);

      return {
        answer: response?.choices[0]?.message?.content || '',
        sources: weightedDocs.map(doc => doc.document),
      };
    } catch (error) {
      console.error('RAG pipeline error:', error);
      throw error;
    }
  }

  private buildContext(weightedDocs: Array<Document & { weight: number }>): string {
    let context = '';
    let currentLength = 0;

    // Sort by weight descending
    const sortedDocs = [...weightedDocs].sort((a, b) => b.weight - a.weight);

    // Add documents until we hit context length limit
    for (const doc of sortedDocs) {
      const content = doc.content;
      if (currentLength + content.length <= this.maxContextLength) {
        context += `${content}\n\n`;
        currentLength += content.length;
      } else {
        // If document would exceed limit, try to add a truncated version
        const remainingSpace = this.maxContextLength - currentLength;
        if (remainingSpace > 100) { // Only add if we can include meaningful content
          context += `${content.slice(0, remainingSpace)}...\n\n`;
        }
        break;
      }
    }

    return context.trim();
  }
}