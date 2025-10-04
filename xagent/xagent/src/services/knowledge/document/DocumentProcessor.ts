import type { Document, DocumentChunk } from '../../../types/document';
import { generateEmbeddings } from '../../openai/embeddings';
import { DocumentChunker } from './DocumentChunker';
import { DocumentEmbedder } from './DocumentEmbedder';

export class DocumentProcessor {
  private chunker: DocumentChunker;
  private embedder: DocumentEmbedder;

  constructor() {
    this.chunker = new DocumentChunker();
    this.embedder = new DocumentEmbedder();
  }

  async processDocument(document: Document): Promise<Document> {
    const chunks = await this.chunker.splitDocument(document);
    const processedChunks = await this.embedder.embedChunks(chunks);
    
    return {
      ...document,
      embeddings: await generateEmbeddings(document.content),
      metadata: {
        ...document.metadata,
        processedAt: new Date(),
        chunks: processedChunks.length,
      },
    };
  }
}