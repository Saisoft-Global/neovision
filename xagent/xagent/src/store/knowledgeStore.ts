import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Document } from '../types/document';
import { DocumentProcessor } from '../services/document/DocumentProcessor';
import { useOrganizationStore } from '../stores/organizationStore';  // ✅ Import org store

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
        
        // ✅ Get current organization context
        const { currentOrganization } = useOrganizationStore.getState();
        const { data: { user } } = await supabase.auth.getUser();
        
        // ✅ Enrich document metadata with organization context
        const enrichedDoc = {
          ...doc,
          metadata: {
            ...doc.metadata,
            organization_id: currentOrganization?.id || null,
            user_id: user?.id || null,
            visibility: currentOrganization ? 'organization' : 'private'
          }
        };
        
        const { error } = await supabase
          .from('documents')
          .insert({
            id: enrichedDoc.id,
            title: enrichedDoc.title,
            content: enrichedDoc.content,
            doc_type: enrichedDoc.doc_type,
            metadata: enrichedDoc.metadata,
            status: enrichedDoc.status,
          });

        if (error) throw error;

        set((state) => ({
          documents: [enrichedDoc, ...state.documents]
        }));

        // Process document after adding (with org metadata)
        await documentProcessor.processDocument(enrichedDoc);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add document';
        set({ error: message });
        throw error;
      }
    },

    addKnowledge: async (content: string, source?: string) => {
      try {
        set({ error: null });
        
        // ✅ Get current organization context
        const { currentOrganization } = useOrganizationStore.getState();
        const { data: { user } } = await supabase.auth.getUser();
        
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
            // ✅ CRITICAL: Include organization metadata for multi-tenancy
            organization_id: currentOrganization?.id || null,
            user_id: user?.id || null,
            visibility: currentOrganization ? 'organization' : 'private'
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