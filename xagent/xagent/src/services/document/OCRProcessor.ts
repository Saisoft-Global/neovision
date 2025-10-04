import type { Document } from '../../types/document';
import { createWorker } from 'tesseract.js';

export class OCRProcessor {
  private static instance: OCRProcessor;
  private worker: Tesseract.Worker | null = null;

  private constructor() {
    this.initializeWorker();
  }

  public static getInstance(): OCRProcessor {
    if (!this.instance) {
      this.instance = new OCRProcessor();
    }
    return this.instance;
  }

  private async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
  }

  async processImage(document: Document): Promise<string> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    try {
      const result = await this.worker!.recognize(document.content);
      return result.data.text;
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}