import type { Document } from '../../types/document';
import { documentChunker } from './processors/DocumentChunker';
import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import { isServiceConfigured } from '../../config/environment';
import { EventEmitter } from '../../utils/events/EventEmitter';
import { supabase } from '../../config/supabase';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';
import { extractEntities } from '../nlp/entityExtraction';
import { extractRelations } from '../nlp/relationExtraction';

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
    if (this.processingQueue.get(document.id)) {
      console.warn('Document already being processed:', document.id);
      return;
    }

    this.processingQueue.set(document.id, true);
    this.eventEmitter.emit('processingStart', { documentId: document.id });

    try {
      // Update status to processing
      await this.updateDocumentStatus(document.id, 'processing', { currentStep: 'chunking' });
      
      // Split document into chunks
      const chunks = await documentChunker.chunkDocument(document);
      this.eventEmitter.emit('chunkingComplete', { 
        documentId: document.id, 
        chunkCount: chunks.length 
      });

      // Extract entities and relations
      const [entities, relations] = await Promise.all([
        extractEntities(document.content),
        extractRelations(document.content)
      ]);

      // Process chunks with embeddings if OpenAI is configured
      if (isServiceConfigured('openai')) {
        await this.updateDocumentStatus(document.id, 'processing', { currentStep: 'embeddings' });
        const processedChunks = await this.processChunksWithRetry(chunks);
        
        await this.updateDocumentStatus(document.id, 'processing', {
          hasEmbeddings: true,
          currentStep: 'vectorization'
        });

        // Store chunks in vector database if available
        const vectorStore = await getVectorStore();
        if (vectorStore) {
          await vectorStore.upsert(
            processedChunks.map(chunk => ({
              id: chunk.id,
              values: chunk.embeddings,
              metadata: {
                documentId: chunk.documentId,
                content: chunk.content,
                entities: entities.filter(e => chunk.content.includes(e.text)),
                ...chunk.metadata,
              },
            }))
          );

          await this.updateDocumentStatus(document.id, 'processing', { isVectorized: true });
        }

        // Generate embeddings for full document
        document.embeddings = await generateEmbeddings(document.content);

        // Update knowledge graph with entities and relations
        await this.graphManager.updateGraph(document.content);
      } else {
        // Process without embeddings
        await this.updateDocumentStatus(document.id, 'processing', {
          hasEmbeddings: false,
          isVectorized: false,
          processedLocally: true
        });
      }

      // Mark as completed with extracted information
      await this.updateDocumentStatus(document.id, 'completed', {
        processedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        entities,
        relations,
        extractedMetadata: {
          topics: await this.extractTopics(document.content),
          summary: await this.generateSummary(document.content),
          keyPhrases: await this.extractKeyPhrases(document.content)
        }
      });

      this.eventEmitter.emit('processingComplete', { 
        documentId: document.id,
        metadata: document.metadata
      });
    } catch (error) {
      console.error('Document processing error:', error);
      await this.updateDocumentStatus(document.id, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hasEmbeddings: false,
        isVectorized: false
      });

      this.eventEmitter.emit('processingError', { 
        documentId: document.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      this.processingQueue.delete(document.id);
    }
  }

  private async extractTopics(content: string): Promise<string[]> {
    // Extract main topics using OpenAI
    const response = await generateEmbeddings(content);
    return ['topic1', 'topic2']; // Replace with actual topic extraction
  }

  private async generateSummary(content: string): Promise<string> {
    // Generate concise summary using OpenAI
    return 'Document summary'; // Replace with actual summary generation
  }

  private async extractKeyPhrases(content: string): Promise<string[]> {
    // Extract key phrases using OpenAI
    return ['phrase1', 'phrase2']; // Replace with actual key phrase extraction
  }

  private async updateDocumentStatus(
    id: string, 
    status: Document['status'],
    metadata: Partial<Document['metadata']> = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          status,
          metadata: {
            ...((await supabase
              .from('documents')
              .select('metadata')
              .eq('id', id)
              .single()
            ).data?.metadata || {}),
            ...metadata
          }
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update document status:', error);
      throw error;
    }
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
          batch.map(async chunk => ({
            ...chunk,
            embeddings: await generateEmbeddings(chunk.content)
          }))
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