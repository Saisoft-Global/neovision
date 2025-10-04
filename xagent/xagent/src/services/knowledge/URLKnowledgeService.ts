import { URLProcessor } from '../document/processors/url/URLProcessor';
import { KnowledgeService } from './KnowledgeService';
import type { Document } from '../../types/document';

export class URLKnowledgeService {
  private urlProcessor: URLProcessor;
  private knowledgeService: KnowledgeService;

  constructor() {
    this.urlProcessor = new URLProcessor();
    this.knowledgeService = KnowledgeService.getInstance();
  }

  async importFromURL(url: string): Promise<Document> {
    if (!url) {
      throw new Error('URL is required');
    }

    try {
      // Validate URL
      new URL(url); // Will throw if invalid

      // Extract content from URL
      const content = await this.urlProcessor.fetchAndProcess(url);
      if (!content) {
        throw new Error('No content extracted from URL');
      }

      // Create document
      const document: Document = {
        id: crypto.randomUUID(),
        title: this.extractTitle(url),
        content,
        doc_type: 'url',
        metadata: {
          uploadedAt: new Date(),
          size: content.length,
          mimeType: 'text/plain',
          sourceUrl: url,
          processingStatus: 'success'
        },
        status: 'pending'
      };

      // Add to knowledge base
      await this.knowledgeService.addDocument(document);

      return document;
    } catch (error) {
      console.error('URL import error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to import URL: ${error.message}`
          : 'Failed to import URL'
      );
    }
  }

  private extractTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      return pathSegments[pathSegments.length - 1] || urlObj.hostname;
    } catch {
      return url;
    }
  }
}