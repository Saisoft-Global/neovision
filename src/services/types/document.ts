export interface Field {
  id: string;
  label: string;
  value: string;
  confidence: number;
  bbox?: [number, number, number, number];
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
}

export interface ProcessDocumentResponse {
  fields: Field[];
  documentType: string;
  confidence: number;
}