import { PDFProcessor } from './pdf/PDFProcessor';
import { ExcelProcessor } from './excel/ExcelProcessor';
import { ImageProcessor } from './image/ImageProcessor';
import { TextProcessor } from './text/TextProcessor';
import { PresentationProcessor } from './presentation/PresentationProcessor';
import type { Document } from '../../types/document';

export class DocumentProcessorFactory {
  private static processors = new Map<string, any>();

  static {
    // Register processors
    this.processors.set('application/pdf', new PDFProcessor());
    this.processors.set('text/plain', new TextProcessor());
    this.processors.set('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', new ExcelProcessor());
    this.processors.set('image/png', new ImageProcessor());
    this.processors.set('image/jpeg', new ImageProcessor());
    this.processors.set('application/vnd.openxmlformats-officedocument.presentationml.presentation', new PresentationProcessor());
  }

  static async processDocument(file: File): Promise<Document> {
    const processor = this.processors.get(file.type);
    if (!processor) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const content = await processor.processFile(file);
    return {
      id: crypto.randomUUID(),
      title: file.name,
      content,
      doc_type: file.type,
      metadata: {
        uploadedAt: new Date(),
        size: file.size,
        mimeType: file.type,
      },
      status: 'pending',
    };
  }
}