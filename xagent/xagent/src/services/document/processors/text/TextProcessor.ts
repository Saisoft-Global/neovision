import { sanitizeContent } from '../../utils/sanitization';

export class TextProcessor {
  async processFile(file: File): Promise<string> {
    try {
      const content = await file.text();
      return sanitizeContent(content);
    } catch (error) {
      console.error('Text processing error:', error);
      throw new Error('Failed to process text file');
    }
  }
}