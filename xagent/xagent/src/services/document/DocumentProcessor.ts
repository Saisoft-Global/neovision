import type { Document } from '../../types/document';
import { documentChunker } from './processors/DocumentChunker';
import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import { isServiceConfigured } from '../../config/environment';
import { EventEmitter } from '../../utils/events/EventEmitter';
import { supabase } from '../../config/supabase';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';

export class DocumentProcessor {
  private static instance: DocumentProcessor | null = null;
  private processingQueue: Map<string, boolean>;
  private eventEmitter: EventEmitter;
  private graphManager: KnowledgeGraphManager;

  private constructor() {
    this.processingQueue = new Map();
    this.eventEmitter = new EventEmitter();
    this.graphManager = new KnowledgeGraphManager();
  }

  public static getInstance(): DocumentProcessor {
    if (!this.instance) {
      this.instance = new DocumentProcessor();
    }
    return this.instance;
  }

  async processDocument(document: Document): Promise<void> {
    if (!document?.id || !document?.content) {
      throw new Error('Invalid document: missing required fields');
    }

    if (!document.doc_type) {
      throw new Error('Document type is required');
    }

    if (this.processingQueue.get(document.id)) {
      throw new Error('Document is already being processed');
    }

    this.processingQueue.set(document.id, true);
    this.eventEmitter.emit('processingStart', { documentId: document.id });

    try {
      // Update status to processing
      await this.updateDocumentStatus(document.id, 'processing', { 
        currentStep: 'initialization',
        startTime: new Date().toISOString(),
        originalSize: document.content.length
      });

      // Split into chunks
      await this.updateDocumentStatus(document.id, 'processing', { currentStep: 'chunking' });
      const chunks = await documentChunker.chunkDocument(document);
      
      if (!chunks.length) {
        throw new Error('Failed to generate document chunks');
      }

      this.eventEmitter.emit('chunkingComplete', { 
        documentId: document.id, 
        chunkCount: chunks.length 
      });

      // Process with embeddings if OpenAI is available
      if (isServiceConfigured('openai')) {
        await this.processWithEmbeddings(document, chunks);
      } else {
        await this.processWithoutEmbeddings(document, chunks);
      }

      // Mark as completed
      await this.updateDocumentStatus(document.id, 'completed', {
        processedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        finalSize: document.content.length,
        processingTime: Date.now() - new Date(document.metadata.startTime).getTime()
      });

      this.eventEmitter.emit('processingComplete', { 
        documentId: document.id,
        metadata: document.metadata
      });
    } catch (error) {
      console.error('Document processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateDocumentStatus(document.id, 'failed', {
        error: errorMessage,
        failedAt: new Date().toISOString()
      });

      this.eventEmitter.emit('processingError', { 
        documentId: document.id, 
        error: errorMessage
      });
      
      throw error;
    } finally {
      this.processingQueue.delete(document.id);
    }
  }

  private async processWithEmbeddings(document: Document, chunks: any[]): Promise<void> {
    await this.updateDocumentStatus(document.id, 'processing', { 
      currentStep: 'embeddings',
      hasEmbeddings: false
    });

    const processedChunks = await this.processChunksWithRetry(chunks);
    
    await this.updateDocumentStatus(document.id, 'processing', {
      hasEmbeddings: true,
      currentStep: 'vectorization'
    });

    // Store in vector database if available
    const vectorStore = await getVectorStore();
    if (vectorStore) {
      await vectorStore.upsert(
        processedChunks.map(chunk => ({
          id: chunk.id,
          values: chunk.embeddings,
          metadata: {
            documentId: chunk.documentId,
            content: chunk.content,
            ...chunk.metadata,
          },
        }))
      );

      await this.updateDocumentStatus(document.id, 'processing', { 
        isVectorized: true,
        vectorCount: processedChunks.length
      });
    }

    // Generate embeddings for full document
    document.embeddings = await generateEmbeddings(document.content);

    // Update knowledge graph
    await this.graphManager.updateGraph(document.content);
  }

  private async processWithoutEmbeddings(document: Document, chunks: any[]): Promise<void> {
    await this.updateDocumentStatus(document.id, 'processing', {
      hasEmbeddings: false,
      isVectorized: false,
      processedLocally: true,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
      }))
    });
  }

  private async processChunksWithRetry(chunks: any[], attempt = 0): Promise<any[]> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    const BATCH_SIZE = 5;

    try {
      const processedChunks = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async chunk => {
            try {
              return {
                ...chunk,
                embeddings: await generateEmbeddings(chunk.content)
              };
            } catch (error) {
              console.error(`Failed to process chunk ${chunk.id}:`, error);
              throw error;
            }
          })
        );
        processedChunks.push(...batchResults);

        // Add delay between batches to avoid rate limits
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return processedChunks;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt))
        );
        return this.processChunksWithRetry(chunks, attempt + 1);
      }
      throw error;
    }
  }

  private async updateDocumentStatus(
    id: string, 
    status: Document['status'],
    metadata: Partial<Document['metadata']> = {}
  ): Promise<void> {
    try {
      const { data: currentDoc } = await supabase
        .from('documents')
        .select('metadata')
        .eq('id', id)
        .single();

      const updatedMetadata = {
        ...(currentDoc?.metadata || {}),
        ...metadata,
        lastUpdated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('documents')
        .update({ 
          status,
          metadata: updatedMetadata
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update document status:', error);
      throw error;
    }
  }

  isProcessing(documentId: string): boolean {
    return this.processingQueue.get(documentId) || false;
  }

  onProcessingStart(callback: (data: { documentId: string }) => void): void {
    this.eventEmitter.on('processingStart', callback);
  }

  onChunkingComplete(callback: (data: { documentId: string; chunkCount: number }) => void): void {
    this.eventEmitter.on('chunkingComplete', callback);
  }

  onProcessingComplete(callback: (data: { documentId: string; metadata: any }) => void): void {
    this.eventEmitter.on('processingComplete', callback);
  }

  onProcessingError(callback: (data: { documentId: string; error: string }) => void): void {
    this.eventEmitter.on('processingError', callback);
  }
}