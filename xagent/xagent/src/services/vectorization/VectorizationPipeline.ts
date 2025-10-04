import { EventEmitter } from '../../utils/events/EventEmitter';
import { ChunkProcessor } from './processors/ChunkProcessor';
import { VectorStorage } from './storage/VectorStorage';
import { DocumentChunker } from '../document/processors/DocumentChunker';
import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import type { Document } from '../../types/document';

export class VectorizationPipeline {
  private static instance: VectorizationPipeline | null = null;
  private eventEmitter: EventEmitter;
  private chunkProcessor: ChunkProcessor;
  private vectorStorage: VectorStorage;
  private documentChunker: DocumentChunker;
  private processingQueue: Map<string, boolean>;
  private _initialized: boolean = false;
  private _error: string | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.chunkProcessor = new ChunkProcessor();
    this.vectorStorage = new VectorStorage();
    this.documentChunker = DocumentChunker.getInstance();
    this.processingQueue = new Map();
  }

  public static getInstance(): VectorizationPipeline {
    if (!VectorizationPipeline.instance) {
      VectorizationPipeline.instance = new VectorizationPipeline();
    }
    return VectorizationPipeline.instance;
  }

  async verifyConnection(): Promise<void> {
    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        this._error = 'Vector store not available - some features will be limited';
        return;
      }
      await vectorStore.describeIndexStats();
      this._initialized = true;
      this._error = null;
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Vector store connection failed';
      console.error('Failed to verify vector store connection:', error);
    }
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  getError(): string | null {
    return this._error;
  }

  async processDocument(document: Document): Promise<void> {
    if (this.processingQueue.get(document.id)) {
      throw new Error('Document already being processed');
    }

    this.processingQueue.set(document.id, true);
    this.eventEmitter.emit('processingStart', { documentId: document.id });

    try {
      // Split into chunks
      const chunks = await this.documentChunker.chunkDocument(document);
      this.eventEmitter.emit('chunkingComplete', { 
        documentId: document.id, 
        chunkCount: chunks.length 
      });

      // Process chunks if OpenAI is configured
      if (import.meta.env.VITE_OPENAI_API_KEY) {
        const processedChunks = await this.chunkProcessor.processChunksWithRateLimit(chunks);
        this.eventEmitter.emit('embeddingsGenerated', { 
          documentId: document.id, 
          chunkCount: processedChunks.length 
        });

        // Store vectors if available
        const vectorStore = await getVectorStore();
        if (vectorStore) {
          await this.vectorStorage.storeVectors(processedChunks);
          this.eventEmitter.emit('vectorsStored', { documentId: document.id });
        }

        // Generate embeddings for full document
        document.embeddings = await generateEmbeddings(document.content);
      } else {
        // Process without embeddings
        document.metadata.processedLocally = true;
      }

      document.metadata.processedAt = new Date().toISOString();
      document.metadata.chunkCount = chunks.length;
      document.status = 'completed';

      this.eventEmitter.emit('processingComplete', { 
        documentId: document.id,
        metadata: document.metadata
      });
    } catch (error) {
      document.status = 'failed';
      document.metadata.error = error instanceof Error ? error.message : 'Unknown error';
      this.eventEmitter.emit('processingError', { 
        documentId: document.id, 
        error: document.metadata.error 
      });
      throw error;
    } finally {
      this.processingQueue.delete(document.id);
    }
  }

  onProcessingStart(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('processingStart', callback);
  }

  onChunkingComplete(callback: (data: { documentId: string; chunkCount: number }) => void): void {
    this.eventEmitter.on('chunkingComplete', callback);
  }

  onEmbeddingsGenerated(callback: (data: { documentId: string; chunkCount: number }) => void): void {
    this.eventEmitter.on('embeddingsGenerated', callback);
  }

  onVectorsStored(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('vectorsStored', callback);
  }

  onProcessingComplete(callback: (data: { documentId: string; metadata: any }) => void): void {
    this.eventEmitter.on('processingComplete', callback);
  }

  onProcessingError(callback: (data: { documentId: string; error: string }) => void): void {
    this.eventEmitter.on('processingError', callback);
  }
}