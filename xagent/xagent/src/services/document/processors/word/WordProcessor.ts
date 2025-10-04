import { loadMammoth } from '../../../../utils/imports';
import { sanitizeContent } from '../../utils/sanitization';

export class WordProcessor {
  async processFile(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await loadMammoth();
      
      const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer,
      });

      if (!result.value) {
        throw new Error('No content could be extracted from Word document');
      }

      return sanitizeContent(result.value);
    } catch (error) {
      console.error('Word processing error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to process Word document: ${error.message}`
          : 'Failed to process Word document'
      );
    }
  }
}