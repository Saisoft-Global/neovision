import type { Document, DocumentChunk } from '../../../types/document';

export class DocumentChunker {
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;

  async splitDocument(document: Document): Promise<DocumentChunk[]> {
    const chunks = this.splitIntoChunks(document.content);
    
    return chunks.map((content, index) => ({
      id: `${document.id}-chunk-${index}`,
      documentId: document.id,
      content,
      embeddings: [],
      metadata: {
        pageNumber: Math.floor(index / this.CHUNK_SIZE) + 1,
        position: {
          start: index * (this.CHUNK_SIZE - this.CHUNK_OVERLAP),
          end: (index + 1) * this.CHUNK_SIZE,
        },
      },
    }));
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.CHUNK_SIZE, text.length);
      chunks.push(text.slice(startIndex, endIndex));
      startIndex += this.CHUNK_SIZE - this.CHUNK_OVERLAP;
    }
    
    return chunks;
  }
}