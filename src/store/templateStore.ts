import { create } from 'zustand';

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  required: boolean;
  regex?: string;
  description?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentType: string;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

interface TemplateStore {
  templates: DocumentTemplate[];
  addTemplate: (template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, template: Partial<DocumentTemplate>) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templates: [],
  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  })),
  updateTemplate: (id, template) => set((state) => ({
    templates: state.templates.map((t) =>
      t.id === id
        ? { ...t, ...template, updatedAt: new Date().toISOString() }
        : t
    )
  })),
  deleteTemplate: (id) => set((state) => ({
    templates: state.templates.filter((t) => t.id !== id)
  }))
}));