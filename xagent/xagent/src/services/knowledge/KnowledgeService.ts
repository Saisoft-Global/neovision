import { supabase } from '../../config/supabase';
import type { Document } from '../../types/document';
import type { SearchResult } from '../../types/search';
import { DocumentProcessor } from '../document/DocumentProcessor';
import { InitializationManager } from './initialization/InitializationManager';
import { VectorSearchService } from '../vectorization/VectorSearchService';
import { generateEmbeddings } from '../openai/embeddings';
import { isServiceConfigured } from '../../config/environment';

export class KnowledgeService {
  private static instance: KnowledgeService | null = null;
  private documentProcessor: DocumentProcessor;
  private initializationManager: InitializationManager;
  private vectorSearchService: VectorSearchService;

  private constructor() {
    this.documentProcessor = DocumentProcessor.getInstance();
    this.initializationManager = InitializationManager.getInstance();
    this.vectorSearchService = VectorSearchService.getInstance();
  }

  public static getInstance(): KnowledgeService {
    if (!this.instance) {
      this.instance = new KnowledgeService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    await this.initializationManager.initialize();
  }

  isInitialized(): boolean {
    return this.initializationManager.isInitialized();
  }

  getError(): string | null {
    return this.initializationManager.getError();
  }

  async addDocument(document: Document): Promise<void> {
    if (!document.doc_type) {
      document.doc_type = this.inferDocumentType(document);
    }

    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          id: document.id,
          title: document.title,
          content: document.content,
          doc_type: document.doc_type,
          metadata: document.metadata,
          status: document.status,
        });

      if (error) throw error;

      // Process document after adding
      await this.documentProcessor.processDocument(document);
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  }

  private inferDocumentType(document: Document): string {
    if (document.metadata?.mimeType) {
      const mimeType = document.metadata.mimeType.toLowerCase();
      
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('word')) return 'doc';
      if (mimeType.includes('excel')) return 'xls';
      if (mimeType.includes('image')) return 'image';
      if (mimeType.includes('text')) return 'text';
      if (mimeType.includes('html')) return 'url';
    }

    // Fallback to text
    return 'text';
  }

  async queryKnowledge(query: string): Promise<SearchResult[]> {
    try {
      if (!isServiceConfigured('openai')) {
        console.warn('OpenAI not configured - skipping vector search');
        return this.fallbackSearch(query);
      }

      // Generate embeddings for the query
      const queryEmbeddings = await generateEmbeddings(query);

      // Search using vector service
      const vectorResults = await this.vectorSearchService.searchSimilarDocuments(query, {
        threshold: 0.7,
        topK: 5
      });

      // Enhance results with metadata
      return vectorResults.map(result => ({
        ...result,
        type: 'document',
        source: 'vector_search',
        timestamp: new Date(result.metadata.uploadedAt)
      }));
    } catch (error) {
      console.error('Knowledge query error:', error);
      return this.fallbackSearch(query);
    }
  }

  private async fallbackSearch(query: string): Promise<SearchResult[]> {
    // Fallback to basic text search
    const { data } = await supabase
      .from('documents')
      .select('*')
      .textSearch('content', query)
      .limit(5);

    return (data || []).map(doc => ({
      id: doc.id,
      content: doc.content,
      score: 1.0, // Default score for text search
      metadata: doc.metadata,
      type: 'document',
      source: 'text_search',
      timestamp: new Date(doc.created_at)
    }));
  }

  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to get document:', error);
      return null;
    }

    return data;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}