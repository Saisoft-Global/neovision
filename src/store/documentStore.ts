import { create } from 'zustand';

export interface Field {
  id: string;
  label: string;
  value: string;
  confidence: number;
  bbox?: [number, number, number, number];
  pageNumber?: number;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  status: 'processing' | 'completed' | 'error';
  documentType: string;
  fields: Field[];
  createdAt: string;
  meta?: {
    raw?: any;
    pipelineUsed?: { ocr?: string; ner?: string };
    documentType?: string;
    extractedFields?: Record<string, any>;
    tables?: any[];
  };
}

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  addDocument: (doc: Document) => void;
  setCurrentDocument: (doc: Document | null) => void;
  updateFields: (docId: string, fields: Field[]) => void;
  setDocumentError: (docId: string) => void;
  setDocumentMeta: (docId: string, meta: Partial<NonNullable<Document['meta']>>) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  currentDocument: null,
  addDocument: (doc) => set((state) => ({
    documents: [...state.documents, { ...doc, fields: [] }]
  })),
  setCurrentDocument: (doc) => set({ 
    currentDocument: doc ? { ...doc, fields: [...doc.fields] } : null 
  }),
  updateFields: (docId, fields) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === docId 
        ? { 
            ...doc, 
            fields: fields.map(f => ({ ...f, bbox: f.bbox ? [...f.bbox] : undefined })),
            status: 'completed' 
          } 
        : doc
    )
  })),
  setDocumentError: (docId) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === docId ? { ...doc, status: 'error' } : doc
    )
  })),
  setDocumentMeta: (docId, meta) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === docId ? { ...doc, meta: { ...(doc.meta || {}), ...meta } } : doc
    )
  }))
}));