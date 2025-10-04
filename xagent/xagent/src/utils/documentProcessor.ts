```typescript
import type { Document } from '../types/document';
import { DocumentProcessor } from '../services/document/DocumentProcessor';
import { BrowserDocumentProcessor } from '../services/document/processors/BrowserDocumentProcessor';

export async function processDocument(file: File): Promise<Document> {
  try {
    // Process file content
    const browserProcessor = BrowserDocumentProcessor.getInstance();
    const content = await browserProcessor.processDocument(file);

    // Create document object
    const document: Document = {
      id: crypto.randomUUID(),
      title: file.name,
      content,
      doc_type: file.type,
      metadata: {
        uploadedAt: new Date().toISOString(),
        size: file.size,
        mimeType: file.type,
      },
      status: 'pending',
    };

    // Process document (generate embeddings, etc)
    const processor = DocumentProcessor.getInstance();
    await processor.processDocument(document);

    return document;
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}
```