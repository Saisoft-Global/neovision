import { loadPDFJS } from '../../../../utils/imports/pdf';
import { sanitizeContent } from '../../utils/sanitization';

export class PDFProcessor {
  private static workerLoaded = false;
  private static initializationPromise: Promise<void> | null = null;
  private static retryAttempts = 0;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  async processFile(file: File): Promise<string> {
    try {
      const pdfjsLib = await loadPDFJS();
      
      // Ensure worker is loaded
      if (!PDFProcessor.workerLoaded) {
        if (!PDFProcessor.initializationPromise) {
          PDFProcessor.initializationPromise = this.initializeWorker(pdfjsLib);
        }
        await PDFProcessor.initializationPromise;
      }

      const arrayBuffer = await file.arrayBuffer();
      
      // Validate PDF header
      if (!this.isPDFFile(arrayBuffer)) {
        throw new Error('Invalid PDF file format');
      }

      // Load PDF document with robust configuration
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false, // Disable worker fetch to avoid CORS issues
        isEvalSupported: false,
        disableFontFace: true, // Disable font face loading to avoid missing font errors
        verbosity: 0,
        // Remove standardFontDataUrl since fonts are missing
        // Remove cMapUrl to avoid network dependencies
      });

      const pdf = await loadingTask.promise;
      
      if (!pdf || pdf.numPages === 0) {
        throw new Error('PDF document is empty or invalid');
      }

      const textContent: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          
          const text = content.items
            .map(item => 'str' in item ? item.str : '')
            .join(' ');
            
          textContent.push(text);
          await page.cleanup();
        } catch (pageError) {
          console.warn(`Failed to process page ${i}:`, pageError);
          textContent.push(`[Error extracting page ${i}]`);
          continue;
        }
      }

      // Clean up resources
      await pdf.destroy();
      await loadingTask.destroy();

      const extractedText = textContent.join('\n\n');
      if (!extractedText.trim()) {
        throw new Error('No text content could be extracted from PDF');
      }

      return sanitizeContent(extractedText);
    } catch (error) {
      if (error instanceof Error && error.message.includes('worker')) {
        // Retry worker initialization
        if (PDFProcessor.retryAttempts < PDFProcessor.MAX_RETRIES) {
          PDFProcessor.retryAttempts++;
          PDFProcessor.workerLoaded = false;
          PDFProcessor.initializationPromise = null;
          await new Promise(resolve => setTimeout(resolve, PDFProcessor.RETRY_DELAY));
          return this.processFile(file);
        }
      }
      
      console.error('PDF processing error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to process PDF: ${error.message}`
          : 'Failed to process PDF file'
      );
    }
  }

  private async initializeWorker(pdfjsLib: any): Promise<void> {
    try {
      // Test worker with minimal valid PDF
      const testData = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, // %PDF
        0x2D, 0x31, 0x2E, 0x34, // -1.4
        0x0A, 0x25, 0xE2, 0xE3, // Header
        0x0A, 0x0A             // EOF
      ]);

      const testLoadingTask = pdfjsLib.getDocument({
        data: testData,
        useWorkerFetch: false, // Disable worker fetch to avoid CORS
        disableFontFace: true, // Disable font face loading
        verbosity: 0
      });

      await testLoadingTask.promise;
      await testLoadingTask.destroy();

      PDFProcessor.workerLoaded = true;
      PDFProcessor.initializationPromise = null;
      PDFProcessor.retryAttempts = 0;
    } catch (error) {
      PDFProcessor.workerLoaded = false;
      PDFProcessor.initializationPromise = null;
      console.error('Failed to initialize PDF worker:', error);
      throw error;
    }
  }

  private isPDFFile(arrayBuffer: ArrayBuffer): boolean {
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.length < 4) return false;
    
    // Check for PDF signature %PDF
    const pdfHeader = [0x25, 0x50, 0x44, 0x46];
    return pdfHeader.every((byte, i) => uint8Array[i] === byte);
  }
}