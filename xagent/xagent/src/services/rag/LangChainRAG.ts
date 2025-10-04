import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { getSupabaseClient } from '../../config/supabase';
import { LangChainService } from '../llm/LangChainService';
import { EventEmitter } from '../../utils/events/EventEmitter';
import type { Document } from '../../types/document';

export class LangChainRAG {
  private static instance: LangChainRAG;
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private langChain: LangChainService;
  private eventEmitter: EventEmitter;
  private initialized: boolean = false;

  private constructor() {
    this.langChain = LangChainService.getInstance();
    this.eventEmitter = new EventEmitter();
    this.initialize();
  }

  public static getInstance(): LangChainRAG {
    if (!this.instance) {
      this.instance = new LangChainRAG();
    }
    return this.instance;
  }

  private async initialize() {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      });

      this.vectorStore = await SupabaseVectorStore.fromExistingIndex(
        this.embeddings,
        {
          client: supabase,
          tableName: 'documents',
          queryName: 'match_documents',
        }
      );

      this.initialized = true;
      this.eventEmitter.emit('initialized');
    } catch (error) {
      console.error('RAG initialization error:', error);
      this.eventEmitter.emit('error', error instanceof Error ? error.message : 'Failed to initialize RAG');
    }
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.vectorStore || !this.initialized) {
      throw new Error('RAG system not initialized');
    }

    const docs = [
      new LangChainDocument({
        pageContent: document.content,
        metadata: {
          id: document.id,
          title: document.title,
          ...document.metadata,
        },
      }),
    ];

    await this.vectorStore.addDocuments(docs);
  }

  async queryKnowledge(query: string): Promise<Document[]> {
    if (!this.vectorStore || !this.initialized) {
      throw new Error('RAG system not initialized');
    }

    const results = await this.vectorStore.similaritySearch(query, 5);
    
    return results.map(doc => ({
      id: doc.metadata.id,
      title: doc.metadata.title,
      content: doc.pageContent,
      doc_type: 'text',
      metadata: doc.metadata,
      status: 'completed',
    }));
  }

  onInitialized(callback: () => void): void {
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }
}