import type { DocumentChunk } from '../../../types/document';
import { generateEmbeddings } from '../../openai/embeddings';
import { vectorStore } from '../../pinecone/client';

export class DocumentEmbedder {
  async embedChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const embeddedChunks = await Promise.all(
      chunks.map(async chunk => {
        const embeddings = await generateEmbeddings(chunk.content);
        return { ...chunk, embeddings };
      })
    );

    await this.storeChunks(embeddedChunks);
    return embeddedChunks;
  }

  private async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    const vectors = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embeddings,
      metadata: {
        documentId: chunk.documentId,
        content: chunk.content,
        ...chunk.metadata,
      },
    }));

    await vectorStore.upsert(vectors);
  }
}