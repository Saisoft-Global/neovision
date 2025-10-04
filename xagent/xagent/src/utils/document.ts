import { PDFProcessor } from '../services/document/processors/pdf/PDFProcessor';
import { ExcelProcessor } from '../services/document/processors/excel/ExcelProcessor';
import { validateFile } from './file';

export async function processFileContent(file: File): Promise<string> {
  try {
    // Validate file first
    const validation = await validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    switch (file.type) {
      case 'application/pdf': {
        const processor = new PDFProcessor();
        return await processor.processFile(file);
      }
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel': {
        const processor = new ExcelProcessor();
        return await processor.processFile(file);
      }
      case 'text/plain':
        return await file.text();
      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to process document'
    );
  }
}