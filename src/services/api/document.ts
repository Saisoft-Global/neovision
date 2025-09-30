import { api } from './config';
import type { ProcessDocumentResponse } from '../types/document';
import type { Field } from '../../store/documentStore';

export const processDocumentAPI = async (file: File): Promise<ProcessDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<any>('/inference/process-document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const data = response.data || {};
  const documentType = data.documentType || data.document_type || 'unknown';
  const overallConfidence = typeof data.confidence === 'number' ? data.confidence : 0;

  let fields: Field[] = [];
  if (Array.isArray(data.fields)) {
    fields = data.fields as Field[];
  } else if (data.extracted_fields && typeof data.extracted_fields === 'object') {
    fields = Object.entries<any>(data.extracted_fields).map(([key, value], index) => ({
      id: `${key}-${index}`,
      label: key,
      value: value != null ? String(value) : '',
      confidence: 0.0
    }));
  }

  // Derive line items from OCR tables if present
  const lineItemFields: Field[] = [];
  if (Array.isArray(data.tables)) {
    let lineIndex = 1;
    for (const table of data.tables) {
      const rows: any[] = Array.isArray(table?.data) ? table.data : [];
      for (const row of rows) {
        if (Array.isArray(row) && row.length >= 4) {
          const description = row[0] != null ? String(row[0]) : '';
          const quantity = row[1] != null ? String(row[1]) : '';
          const unitPrice = row[2] != null ? String(row[2]) : '';
          const total = row[row.length - 1] != null ? String(row[row.length - 1]) : '';

          const hasAny = description || quantity || unitPrice || total;
          const looksLikeHeader = /description|qty|quantity|rate|price|amount|tax/i.test((row.join(' ')));
          if (hasAny && !looksLikeHeader) {
            lineItemFields.push(
              { id: `line_item_${lineIndex}_description`, label: 'Description', value: description, confidence: 0.0 },
              { id: `line_item_${lineIndex}_quantity`, label: 'Quantity', value: quantity, confidence: 0.0 },
              { id: `line_item_${lineIndex}_price`, label: 'Unit Price', value: unitPrice, confidence: 0.0 },
              { id: `line_item_${lineIndex}_total`, label: 'Total', value: total, confidence: 0.0 }
            );
            lineIndex += 1;
          }
        }
      }
    }
  }

  if (lineItemFields.length > 0) {
    const existingIds = new Set(fields.map(f => f.id));
    const merged = [...fields];
    for (const f of lineItemFields) {
      if (!existingIds.has(f.id)) merged.push(f);
    }
    fields = merged;
  }

  return { fields, documentType, confidence: overallConfidence };
};

// New: list documents with pagination from backend persistence
export const listDocuments = async (params: { limit?: number; offset?: number } = {}) => {
  const { limit = 20, offset = 0 } = params;
  const response = await api.get(`/documents`, { params: { limit, offset } });
  return response.data as {
    total: number;
    limit: number;
    offset: number;
    documents: any[];
  };
};

// New: reprocess a document
export const reprocessDocument = async (documentId: string) => {
  const response = await api.post(`/documents/${documentId}/reprocess`);
  return response.data;
};

// New: delete (soft delete) a document
export const deleteDocument = async (documentId: string) => {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
};