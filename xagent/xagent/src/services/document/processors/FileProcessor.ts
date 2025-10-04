import { Document } from '../../../types/document';
import { extractPDFText } from './extractors/PDFExtractor';
import { extractDocText } from './extractors/DocExtractor';
import { extractExcelText } from './extractors/ExcelExtractor';

export async function processFile(file: File): Promise<string> {
  switch (file.type) {
    case 'application/pdf':
      return extractPDFText(file);
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocText(file);
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return extractExcelText(file);
    case 'text/plain':
      return file.text();
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

export function sanitizeContent(content: string): string {
  return content
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\r\n/g, '\n') // Normalize line endings
    .trim();
}