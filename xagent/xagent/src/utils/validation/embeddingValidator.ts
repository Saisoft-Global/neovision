import { getVectorIndex } from '../../services/pinecone/client';
import { generateEmbeddings } from '../../services/openai/embeddings';
import type { Document } from '../../types/document';

export class EmbeddingValidator {
  async validateDocument(document: Document): Promise<{
    isValid: boolean;
    details: {
      hasEmbeddings: boolean;
      isStoredInVectorDB: boolean;
      embeddingDimensions?: number;
      vectorMatches?: number;
    };
    error?: string;
  }> {
    try {
      // Check if document has embeddings
      const hasEmbeddings = document.embeddings != null && document.embeddings.length > 0;
      
      // Validate vector storage
      let isStoredInVectorDB = false;
      let vectorMatches = 0;

      if (hasEmbeddings) {
        const vectorIndex = await getVectorIndex();
        if (vectorIndex) {
          // Query vector store for the document
          const results = await vectorIndex.query({
            vector: document.embeddings,
            topK: 1,
            includeMetadata: true,
          });

          isStoredInVectorDB = results.matches.length > 0;
          vectorMatches = results.matches.length;
        }
      }

      return {
        isValid: hasEmbeddings && isStoredInVectorDB,
        details: {
          hasEmbeddings,
          isStoredInVectorDB,
          embeddingDimensions: document.embeddings?.length,
          vectorMatches,
        }
      };

    } catch (error) {
      return {
        isValid: false,
        details: {
          hasEmbeddings: false,
          isStoredInVectorDB: false,
        },
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  async testSimilaritySearch(document: Document): Promise<{
    success: boolean;
    similarDocuments?: Array<{id: string; score: number}>;
    error?: string;
  }> {
    try {
      // Generate test embeddings
      const testEmbeddings = await generateEmbeddings(document.content);
      
      const vectorIndex = await getVectorIndex();
      if (!vectorIndex) {
        throw new Error('Vector index not available');
      }

      // Search for similar documents
      const results = await vectorIndex.query({
        vector: testEmbeddings,
        topK: 5,
        includeMetadata: true,
      });

      return {
        success: true,
        similarDocuments: results.matches.map(match => ({
          id: match.id,
          score: match.score,
        }))
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Similarity search failed'
      };
    }
  }
}