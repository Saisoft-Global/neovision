import { ProcessDocumentResponse } from './types/document';

export const mockProcessDocument = (): ProcessDocumentResponse => {
  return {
    fields: [
      {
        id: "invoice_number",
        label: "Invoice Number",
        value: `INV-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.98,
        bbox: [100, 100, 300, 130]
      },
      {
        id: "date",
        label: "Date",
        value: new Date().toISOString().split('T')[0],
        confidence: 0.95,
        bbox: [100, 150, 300, 180]
      },
      {
        id: "total_amount",
        label: "Total Amount",
        value: `$${(Math.random() * 1000).toFixed(2)}`,
        confidence: 0.97,
        bbox: [100, 200, 300, 230]
      }
    ],
    documentType: "invoice",
    confidence: 0.95
  };
};