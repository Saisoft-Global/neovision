import { Document, Field } from '../store/documentStore';
import { DocumentTemplate } from '../store/templateStore';
import { api } from './api/config';

export interface ProcessDocumentResponse {
  fields: Field[];
  documentType: string;
  confidence: number;
  pipelineUsed?: { ocr?: string; ner?: string };
  raw?: any;
  extractedFields?: Record<string, any>;
  tables?: any[];
}

export const processDocument = async (
  document: Document,
  template?: DocumentTemplate | null
): Promise<ProcessDocumentResponse> => {
  try {
    // Create FormData
    const formData = new FormData();
    
    // Get file from URL
    const response = await fetch(document.url);
    const blob = await response.blob();
    formData.append('file', new File([blob], document.name, { type: document.type }));
    
    // Add template if provided
    if (template) {
      formData.append('template', JSON.stringify(template));
    }
    
    // Make API request
    const result = await api.post<any>('/inference/process-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes timeout
    });

    const data = result.data || {};

    // Normalize backend shape to frontend expectations
    const documentType = data.documentType || data.document_type || 'unknown';
    const overallConfidence = typeof data.confidence === 'number' ? data.confidence : 0;

    // Prefer already-array fields if provided; otherwise map extracted_fields object
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

    // Fallback: if no structured fields, surface raw extracted_text as a single field
    if (fields.length === 0) {
      const extractedText = typeof data.extracted_text === 'string'
        ? data.extracted_text
        : (typeof data.extractedText === 'string' ? data.extractedText : '');
      if (extractedText.trim().length > 0) {
        fields.push({
          id: 'extracted_text',
          label: 'Extracted Text',
          value: extractedText,
          confidence: overallConfidence
        });
      }
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
            // Heuristic: avoid header rows containing labels
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
      // Merge, preferring existing fields with same id
      const existingIds = new Set(fields.map(f => f.id));
      const merged = [...fields];
      for (const f of lineItemFields) {
        if (!existingIds.has(f.id)) merged.push(f);
      }
      fields = merged;
    }

    return {
      fields,
      documentType,
      confidence: overallConfidence,
      pipelineUsed: data.pipeline_used || data.pipelineUsed,
      raw: data,
      extractedFields: data.extracted_fields || data.extractedFields,
      tables: Array.isArray(data.tables) ? data.tables : []
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error instanceof Error ? error : new Error('Failed to process document');
  }
};

export const createDocument = (file: File): Document => ({
  id: Date.now().toString(),
  name: file.name,
  type: file.type,
  url: URL.createObjectURL(file),
  status: 'processing',
  documentType: '',
  fields: [],
  createdAt: new Date().toISOString(),
});

export const revokeDocumentUrl = (document: Document) => {
  if (document.url.startsWith('blob:')) {
    URL.revokeObjectURL(document.url);
  }
};