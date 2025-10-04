import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Document } from '../types/document';
import { DocumentProcessor } from '../services/document/DocumentProcessor';

interface KnowledgeState {
  documents: Document[];
  searchResults: Document[];
  isLoading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  addDocument: (doc: Document) => Promise<void>;
  addKnowledge: (content: string, source?: string) => Promise<void>;
  searchKnowledge: (query: string) => Promise<void>;
  clearResults: () => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => {
  const documentProcessor = DocumentProcessor.getInstance();

  return {
    documents: [],
    searchResults: [],
    isLoading: false,
    error: null,

    fetchDocuments: async () => {
      try {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ documents: data || [], isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch documents';
        set({ error: message, isLoading: false });
      }
    },

    addDocument: async (doc: Document) => {
      try {
        set({ error: null });
        const { error } = await supabase
          .from('documents')
          .insert({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            doc_type: doc.doc_type,
            metadata: doc.metadata,
            status: doc.status,
          });

        if (error) throw error;

        set((state) => ({
          documents: [doc, ...state.documents]
        }));

        // Process document after adding
        await documentProcessor.processDocument(doc);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add document';
        set({ error: message });
        throw error;
      }
    },

    addKnowledge: async (content: string, source?: string) => {
      try {
        set({ error: null });
        const document: Document = {
          id: crypto.randomUUID(),
          title: source || 'Manual Entry',
          content,
          doc_type: 'text',
          metadata: {
            uploadedAt: new Date().toISOString(),
            size: content.length,
            mimeType: 'text/plain',
            sourceUrl: source,
          },
          status: 'pending'
        };

        await get().addDocument(document);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add knowledge';
        set({ error: message });
        throw error;
      }
    },

    searchKnowledge: async (query: string) => {
      try {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .textSearch('content', query);

        if (error) throw error;
        set({ searchResults: data || [], isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Search failed';
        set({ error: message, isLoading: false });
      }
    },

    clearResults: () => set({ searchResults: [] }),
  };
});