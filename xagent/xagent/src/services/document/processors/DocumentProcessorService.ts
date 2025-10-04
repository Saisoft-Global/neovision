import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import type { Document } from '../../../types/document';

const execFileAsync = promisify(execFile);

export class DocumentProcessorService {
  private static instance: DocumentProcessorService;
  private pythonScript: string;

  private constructor() {
    this.pythonScript = join(__dirname, 'python', 'document_processor.py');
  }

  public static getInstance(): DocumentProcessorService {
    if (!this.instance) {
      this.instance = new DocumentProcessorService();
    }
    return this.instance;
  }

  async processDocument(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');

      const input = JSON.stringify({
        file: base64Data,
        type: file.type
      });

      const { stdout } = await execFileAsync('python3', [this.pythonScript], {
        input,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const result = JSON.parse(stdout);
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.content;
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }
}