import type { Document } from '../../../types/document';
import { PDFProcessor } from './pdf/PDFProcessor';
import { ExcelProcessor } from './excel/ExcelProcessor';
import { ImageProcessor } from './image/ImageProcessor';
import { WordProcessor } from './word/WordProcessor';
import { sanitizeContent } from '../utils/sanitization';
import { isServiceConfigured } from '../../../config/environment';

export class BrowserDocumentProcessor {
  private static instance: BrowserDocumentProcessor;
  private pdfProcessor: PDFProcessor;
  private excelProcessor: ExcelProcessor;
  private wordProcessor: WordProcessor;
  private imageProcessor: ImageProcessor;

  private constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.excelProcessor = new ExcelProcessor();
    this.wordProcessor = new WordProcessor();
    this.imageProcessor = new ImageProcessor();
  }

  public static getInstance(): BrowserDocumentProcessor {
    if (!this.instance) {
      this.instance = new BrowserDocumentProcessor();
    }
    return this.instance;
  }

  async processDocument(file: File): Promise<string> {
    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type support
      if (!this.isSupportedFileType(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Supported formats: PDF, Office files, images and text files.`);
      }

      // Process based on file type
      let content: string;
      const processingStart = Date.now();

      switch (file.type) {
        case 'application/pdf':
          try {
            content = await this.pdfProcessor.processFile(file);
          } catch (error) {
            console.warn('PDF processing failed, trying fallback:', error);
            // Fallback: return basic file info
            content = `PDF file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n\nNote: PDF text extraction failed. File has been uploaded but content processing is limited.`;
          }
          break;

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          content = await this.excelProcessor.processFile(file);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          content = await this.wordProcessor.processFile(file);
          break;

        case 'image/jpeg':
        case 'image/png':
          if (!isServiceConfigured('openai')) {
            throw new Error('OpenAI API key required for image processing (OCR)');
          }
          content = await this.imageProcessor.processFile(file);
          break;

        case 'text/plain':
          content = await file.text();
          break;

        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      // Validate and sanitize content
      if (!content || typeof content !== 'string') {
        throw new Error('Failed to extract content from file');
      }

      const sanitizedContent = sanitizeContent(content);
      if (!sanitizedContent) {
        throw new Error('No valid content could be extracted from file');
      }

      // Log processing metrics
      const processingTime = Date.now() - processingStart;
      console.debug('Document processing metrics:', {
        fileType: file.type,
        fileSize: file.size,
        processingTime,
        contentLength: sanitizedContent.length
      });

      return sanitizedContent;
    } catch (error) {
      console.error('Document processing error:', error);
      throw error instanceof Error 
        ? error 
        : new Error('Failed to process document');
    }
  }

  private isSupportedFileType(type: string): boolean {
    const supportedTypes = new Set([
      // Document formats
      'application/pdf',
      'text/plain',
      
      // Microsoft Office formats
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      
      // Image formats
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
      
      // Text formats
      'text/csv',
      'text/html',
      'text/xml',
      'application/json',
      'application/xml',
      'text/markdown'
    ]);

    return supportedTypes.has(type);
  }

  getFileTypeDetails(type: string): { 
    supported: boolean;
    requirements?: string[];
    limitations?: string[];
  } {
    const imageTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (imageTypes.includes(type)) {
      return {
        supported: true,
        requirements: ['OpenAI API key for OCR'],
        limitations: ['Maximum image size: 10MB']
      };
    }

    if (officeTypes.includes(type)) {
      return {
        supported: true,
        limitations: [
          'Maximum file size: 10MB',
          'Complex formatting may be simplified',
          'Some features like macros are not supported'
        ]
      };
    }

    if (type === 'application/pdf') {
      return {
        supported: true,
        limitations: [
          'Maximum file size: 10MB',
          'Scanned PDFs require OCR',
          'Complex layouts may affect text extraction'
        ]
      };
    }

    return {
      supported: this.isSupportedFileType(type)
    };
  }
}