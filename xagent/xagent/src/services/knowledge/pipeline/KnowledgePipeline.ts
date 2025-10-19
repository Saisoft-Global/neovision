import { EventEmitter } from '../../../utils/events/EventEmitter';
import { DocumentProcessor } from '../document/DocumentProcessor';
import { KnowledgeGraphManager } from '../graph/KnowledgeGraphManager';
import { VectorSearchService } from '../../vectorization/VectorSearchService';
import { generateEmbeddings } from '../../openai/embeddings';
import { getVectorStore } from '../../pinecone/client';
import { isServiceConfigured } from '../../config/environment';
import type { Document } from '../../../types/document';

export class KnowledgePipeline {
  private static instance: KnowledgePipeline;
  private eventEmitter: EventEmitter;
  private documentProcessor: DocumentProcessor;
  private graphManager: KnowledgeGraphManager;
  private vectorSearch: VectorSearchService;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.documentProcessor = DocumentProcessor.getInstance();
    this.graphManager = new KnowledgeGraphManager();
    this.vectorSearch = VectorSearchService.getInstance();
  }

  public static getInstance(): KnowledgePipeline {
    if (!this.instance) {
      this.instance = new KnowledgePipeline();
    }
    return this.instance;
  }

  async processKnowledge(document: Document): Promise<void> {
    try {
      this.eventEmitter.emit('processingStart', { documentId: document.id });

      // Process document and generate embeddings
      const processedDoc = await this.documentProcessor.processDocument(document);
      this.eventEmitter.emit('documentProcessed', { documentId: document.id });

      // Generate embeddings if OpenAI is configured
      if (isServiceConfigured('openai')) {
        // Generate embeddings for the full document
        const documentEmbeddings = await generateEmbeddings(processedDoc.content);
        
        // Store in vector database
        const vectorStore = await getVectorStore();
        if (vectorStore) {
          await vectorStore.upsert([{
            id: processedDoc.id,
            values: documentEmbeddings,
            metadata: {
              documentId: processedDoc.id,
              content: processedDoc.content.substring(0, 1000), // Truncate to avoid size limits
              title: processedDoc.title,
              ...processedDoc.metadata,
            },
          }]);
          
          this.eventEmitter.emit('vectorsStored', { 
            documentId: processedDoc.id,
            vectorCount: 1
          });
        }

        // Update document with embeddings
        processedDoc.embeddings = documentEmbeddings;
      }

      // Update knowledge graph
      await this.graphManager.updateGraph(processedDoc.content);
      this.eventEmitter.emit('graphUpdated', { documentId: processedDoc.id });

      // Index for vector search
      await this.vectorSearch.indexDocument(processedDoc);

      this.eventEmitter.emit('processingComplete', {
        documentId: document.id,
        status: 'success',
        metadata: {
          hasEmbeddings: Boolean(processedDoc.embeddings),
          isVectorized: true,
          processedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      this.eventEmitter.emit('processingError', {
        documentId: document.id,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
      throw error;
    }
  }

  onProcessingStart(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('processingStart', callback);
  }

  onDocumentProcessed(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('documentProcessed', callback);
  }

  onVectorsStored(callback: (data: { documentId: string; vectorCount: number }) => void): void {
    this.eventEmitter.on('vectorsStored', callback);
  }

  onGraphUpdated(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('graphUpdated', callback);
  }

  onProcessingComplete(callback: (data: { 
    documentId: string; 
    status: string;
    metadata: Record<string, unknown>;
  }) => void): void {
    this.eventEmitter.on('processingComplete', callback);
  }

  onProcessingError(callback: (data: { documentId: string; error: string }) => void): void {
    this.eventEmitter.on('processingError', callback);
  }
}