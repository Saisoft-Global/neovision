import { getVectorStore } from '../../pinecone/client';
import { neo4jClient } from '../../neo4j/client';
import type { Document } from '../../../types/document';

export class KnowledgeValidator {
  async validateDocument(document: Document): Promise<{
    isValid: boolean;
    vectorStore: boolean;
    graphStore: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let vectorStore = false;
    let graphStore = false;

    try {
      // Validate vector store
      const vectorIndex = await getVectorStore();
      if (vectorIndex) {
        const results = await vectorIndex.query({
          vector: document.embeddings || [],
          topK: 1,
          includeMetadata: true,
        });
        vectorStore = results.matches.length > 0;
      } else {
        errors.push('Vector store not available');
      }

      // Validate graph store
      if (neo4jClient) {
        const result = await neo4jClient.executeQuery(
          'MATCH (n:Document {id: $id}) RETURN n',
          { id: document.id }
        );
        graphStore = result && result.length > 0;
      } else {
        errors.push('Graph database not available');
      }

      return {
        isValid: vectorStore && graphStore && errors.length === 0,
        vectorStore,
        graphStore,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed');
      return {
        isValid: false,
        vectorStore: false,
        graphStore: false,
        errors
      };
    }
  }
}