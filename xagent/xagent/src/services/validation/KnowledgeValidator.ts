import { getVectorStore } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';
import type { Document } from '../../types/document';

export class KnowledgeValidator {
  async validateKnowledge(document: Document): Promise<{
    isValid: boolean;
    details: {
      hasEmbeddings: boolean;
      isStoredInVectorDB: boolean;
      embeddingDimensions?: number;
      vectorMatches?: number;
      similarityScore?: number;
    };
  }> {
    try {
      // Check embeddings
      const hasEmbeddings = Boolean(document.embeddings?.length);
      const embeddingDimensions = document.embeddings?.length;

      // Check vector storage
      const vectorStore = await getVectorStore();
      let isStoredInVectorDB = false;
      let vectorMatches = 0;
      let similarityScore = 0;

      if (hasEmbeddings && vectorStore) {
        // Query vector store with document's embeddings
        const results = await vectorStore.query({
          vector: document.embeddings,
          topK: 1,
          includeMetadata: true,
        });

        isStoredInVectorDB = results.matches.some(
          match => match.metadata.id === document.id
        );
        vectorMatches = results.matches.length;
        similarityScore = results.matches[0]?.score || 0;
      }

      return {
        isValid: hasEmbeddings && isStoredInVectorDB,
        details: {
          hasEmbeddings,
          isStoredInVectorDB,
          embeddingDimensions,
          vectorMatches,
          similarityScore,
        },
      };
    } catch (error) {
      console.error('Knowledge validation error:', error);
      throw error;
    }
  }

  async testSimilaritySearch(document: Document): Promise<{
    success: boolean;
    similarDocuments?: Array<{
      id: string;
      score: number;
      content: string;
    }>;
  }> {
    try {
      // Generate fresh embeddings for testing
      const testEmbeddings = await generateEmbeddings(document.content);
      
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }

      // Search for similar documents
      const results = await vectorStore.query({
        vector: testEmbeddings,
        topK: 5,
        includeMetadata: true,
      });

      return {
        success: true,
        similarDocuments: results.matches.map(match => ({
          id: match.id,
          score: match.score,
          content: match.metadata.content,
        })),
      };
    } catch (error) {
      console.error('Similarity search test error:', error);
      return { success: false };
    }
  }
}