import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Document } from '../types/document';
import { DocumentProcessor } from '../services/document/DocumentProcessor';

interface DocumentState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (doc: Document) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  updateDocumentStatus: (id: string, status: Document['status']) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
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

  uploadDocument: async (doc: Document) => {
    try {
      set({ error: null });
      
      // First store the document
      const { error: uploadError } = await supabase
        .from('documents')
        .insert({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          doc_type: doc.doc_type,
          metadata: doc.metadata,
          status: 'processing',
        });

      if (uploadError) throw uploadError;

      // Add to local state
      set((state) => ({
        documents: [{ ...doc, status: 'processing' }, ...state.documents]
      }));

      // Process document asynchronously
      const processor = DocumentProcessor.getInstance();
      try {
        await processor.processDocument(doc);
        
        // Update status to completed
        await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', doc.id);

        // Update local state
        set((state) => ({
          documents: state.documents.map(d => 
            d.id === doc.id ? { ...d, status: 'completed' } : d
          )
        }));
      } catch (processingError) {
        console.error('Document processing error:', processingError);
        
        // Update status to failed
        await supabase
          .from('documents')
          .update({ 
            status: 'failed',
            metadata: {
              ...doc.metadata,
              error: processingError instanceof Error ? processingError.message : 'Processing failed'
            }
          })
          .eq('id', doc.id);

        // Update local state
        set((state) => ({
          documents: state.documents.map(d => 
            d.id === doc.id ? { 
              ...d, 
              status: 'failed',
              metadata: {
                ...d.metadata,
                error: processingError instanceof Error ? processingError.message : 'Processing failed'
              }
            } : d
          )
        }));

        throw processingError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document upload failed';
      set({ error: message });
      throw error;
    }
  },

  updateDocument: async (id: string, updates: Partial<Document>) => {
    try {
      set({ error: null });
      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates } : doc
        )
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update document';
      set({ error: message });
      throw error;
    }
  },

  updateDocumentStatus: async (id: string, status: Document['status']) => {
    try {
      set({ error: null });
      const { error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, status } : doc
        )
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update document status';
      set({ error: message });
      throw error;
    }
  }
}));