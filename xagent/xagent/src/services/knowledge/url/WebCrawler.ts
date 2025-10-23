import { CORSProxy } from './CORSProxy';
import { HTMLExtractor } from './HTMLExtractor';
import { URLProcessor } from './URLProcessor';
import { KnowledgeService } from '../KnowledgeService';
import { sanitizeContent } from '../../document/utils/sanitization';
import { EventEmitter } from '../../../utils/events/EventEmitter';
import { isValidUrl } from '../../../utils/validation';

interface QueueItem {
  url: string;
  depth: number;
}

export class WebCrawler {
  private visited: Set<string> = new Set();
  private queue: QueueItem[] = [];
  private baseUrl: string = '';
  private maxPages: number = 50;
  private htmlExtractor: HTMLExtractor;
  private urlProcessor: URLProcessor;
  private knowledgeService: KnowledgeService;
  private eventEmitter: EventEmitter;
  private processingDelay = 2000; // 2 seconds between pages
  private processedCount = 0;
  private readonly MIN_CONTENT_LENGTH = 50; // Reduced from 100 to be more lenient
  private readonly MAX_DEPTH = 5; // Maximum crawl depth
  private readonly MAX_RETRIES_PER_URL = 3;
  private urlRetries: Map<string, number> = new Map();

  constructor() {
    this.htmlExtractor = new HTMLExtractor();
    this.urlProcessor = new URLProcessor();
    this.knowledgeService = KnowledgeService.getInstance();
    this.eventEmitter = new EventEmitter();
  }

  async crawl(startUrl: string, maxPages: number = 50): Promise<Array<{ url: string; content: string }>> {
    if (!startUrl?.trim() || !isValidUrl(startUrl)) {
      throw new Error(`Invalid start URL: ${startUrl}`);
    }

    this.reset();
    this.maxPages = maxPages;
    
    try {
      const urlObj = new URL(startUrl);
      this.baseUrl = urlObj.origin;
      this.queue.push({ url: startUrl, depth: 0 });
    } catch (error) {
      throw new Error(`Invalid URL format: ${startUrl}`);
    }

    const results: Array<{ url: string; content: string }> = [];

    try {
      this.eventEmitter.emit('crawlStarted', { startUrl, maxPages });

      while (this.queue.length > 0 && this.processedCount < this.maxPages) {
        const { url, depth } = this.queue.shift()!;
        
        if (this.visited.has(url) || depth > this.MAX_DEPTH) continue;

        try {
          this.eventEmitter.emit('processingPage', { 
            url, 
            current: this.processedCount + 1, 
            total: this.maxPages,
            depth 
          });

          const { content, links } = await this.processPageWithRetry(url);
          
          // Validate content before proceeding
          const validContent = this.validateContent(content);
          if (!validContent) {
            this.eventEmitter.emit('pageSkipped', {
              url,
              reason: 'Invalid or insufficient content',
              depth
            });
            continue;
          }

          const validLinks = this.filterValidLinks(links);
          
          results.push({ url, content: validContent });
          
          // Store in knowledge base
          await this.addToKnowledgeBase(url, validContent, depth);
          this.processedCount++;
          
          // Add new links to queue with incremented depth
          if (depth < this.MAX_DEPTH) {
            for (const link of validLinks) {
              if (!this.visited.has(link) && !this.isLinkInQueue(link)) {
                this.queue.push({ url: link, depth: depth + 1 });
              }
            }
          }

          this.eventEmitter.emit('pageProcessed', {
            url,
            contentLength: validContent.length,
            newLinks: validLinks.length,
            depth
          });

          this.visited.add(url);
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to process ${url}:`, errorMessage);
          
          // Handle retries
          const retryCount = (this.urlRetries.get(url) || 0) + 1;
          if (retryCount < this.MAX_RETRIES_PER_URL) {
            this.urlRetries.set(url, retryCount);
            this.queue.push({ url, depth }); // Re-add to queue
            continue;
          }

          this.eventEmitter.emit('pageError', { url, error: errorMessage, depth });
          this.visited.add(url); // Mark as visited to avoid further retries
        }
      }

      this.eventEmitter.emit('crawlCompleted', {
        pagesProcessed: this.processedCount,
        totalPages: results.length,
        baseUrl: this.baseUrl,
        maxDepthReached: this.hasReachedMaxDepth()
      });

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.eventEmitter.emit('crawlError', { error: errorMessage });
      throw error;
    }
  }

  private async processPageWithRetry(url: string): Promise<{ content: string; links: string[] }> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES_PER_URL; attempt++) {
      try {
        const content = await this.urlProcessor.fetchAndProcess(url);
        if (!content) {
          throw new Error('No content extracted from page');
        }

        const links = await this.extractLinks(url);
        return { content, links };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry certain errors
        if (lastError.message.includes('404') || 
            lastError.message.includes('403') ||
            lastError.message.includes('robots.txt')) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }

    throw lastError || new Error(`Failed to process ${url} after retries`);
  }

  private validateContent(content: string): string | null {
    if (!content?.trim()) {
      return null;
    }

    // Remove common boilerplate content
    const cleanContent = content
      .replace(/^(Skip to content|Skip to main content|Navigation|Menu).*$/gm, '')
      .replace(/Copyright © \d{4}.*$/gm, '')
      .replace(/All rights reserved\.?/gi, '')
      .replace(/Privacy Policy|Terms of Service|Cookie Policy/gi, '')
      .trim();

    // Apply sanitization with error handling
    let sanitizedContent: string;
    try {
      sanitizedContent = sanitizeContent(cleanContent);
    } catch (error) {
      console.warn('Content sanitization failed, using raw content:', error);
      sanitizedContent = cleanContent;
    }

    // Check if content is meaningful
    if (sanitizedContent.length < this.MIN_CONTENT_LENGTH) {
      return null;
    }

    // Check for duplicate content markers
    if (this.isDuplicateContent(sanitizedContent)) {
      return null;
    }

    return sanitizedContent;
  }

  private isDuplicateContent(content: string): boolean {
    // Simple duplicate content check - could be enhanced
    const lines = content.split('\n');
    const uniqueLines = new Set(lines);
    return uniqueLines.size < lines.length * 0.5; // More than 50% duplicate lines
  }

  private async extractLinks(url: string): Promise<string[]> {
    try {
      const response = await this.urlProcessor.fetchWithTimeout(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract both href and sitemap links
      const hrefLinks = this.extractHrefLinks(doc, url);
      const sitemapLinks = await this.extractSitemapLinks(url);
      
      return [...new Set([...hrefLinks, ...sitemapLinks])];
    } catch (error) {
      console.warn(`Failed to extract links from ${url}:`, error);
      return [];
    }
  }

  private extractHrefLinks(doc: Document, baseUrl: string): string[] {
    return Array.from(doc.querySelectorAll('a[href]'))
      .map(a => {
        try {
          const href = a.getAttribute('href');
          if (!href) return null;
          return new URL(href, baseUrl).toString();
        } catch {
          return null;
        }
      })
      .filter((link): link is string => 
        link !== null && 
        this.isValidLink(link)
      );
  }

  private async extractSitemapLinks(url: string): Promise<string[]> {
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).toString();
      const response = await this.urlProcessor.fetchWithTimeout(sitemapUrl);
      
      if (!response.ok) return [];
      
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      
      return Array.from(doc.querySelectorAll('loc'))
        .map(loc => loc.textContent)
        .filter((link): link is string => 
          link !== null && 
          this.isValidLink(link)
        );
    } catch {
      return []; // Silently fail if sitemap doesn't exist
    }
  }

  private filterValidLinks(links: string[]): string[] {
    return links.filter(link => {
      try {
        const url = new URL(link);
        return url.origin === this.baseUrl && !this.shouldSkipUrl(link);
      } catch {
        return false;
      }
    });
  }

  private isValidLink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.origin === this.baseUrl && !this.shouldSkipUrl(url);
    } catch {
      return false;
    }
  }

  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      /\.(jpg|jpeg|png|gif|svg|css|js|ico|woff|woff2|ttf|eot)$/i,
      /\/(api|login|logout|signup|signin|register|cart|checkout|admin)\//i,
      /\?utm_/i,
      /\.(pdf|doc|docx|xls|xlsx|zip|rar|tar)$/i,
      /\/(wp-admin|wp-includes|wp-content)\//i,
      /\/(search|tag|category|author)\//i,
      /\/(privacy|terms|contact|about)\//i,
      /\/(feed|rss|xml|sitemap)\//i,
      /#.*/,
      /\?.*=/,
      /mailto:/i,
      /tel:/i,
      /javascript:/i,
      /data:/i,
    ];

    return skipPatterns.some(pattern => pattern.test(url));
  }

  private async addToKnowledgeBase(url: string, content: string, depth: number): Promise<void> {
    try {
      const sanitizedContent = sanitizeContent(content);
      if (!sanitizedContent) {
        throw new Error('No valid content to add to knowledge base');
      }

      const document = {
        id: crypto.randomUUID(),
        title: this.extractTitle(url),
        content: sanitizedContent,
        doc_type: 'url',
        metadata: {
          uploadedAt: new Date().toISOString(),
          size: sanitizedContent.length,
          mimeType: 'text/html',
          sourceUrl: url,
          crawlTimestamp: new Date().toISOString(),
          crawlDepth: depth,
          baseUrl: this.baseUrl
        },
        status: 'pending'
      };

      await this.knowledgeService.addDocument(document);
      
      this.eventEmitter.emit('documentAdded', {
        url,
        documentId: document.id,
        contentLength: sanitizedContent.length,
        depth
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to add ${url} to knowledge base:`, errorMessage);
      this.eventEmitter.emit('documentError', { url, error: errorMessage });
      throw error;
    }
  }

  private extractTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      const title = pathSegments[pathSegments.length - 1] || urlObj.hostname;
      return decodeURIComponent(title)
        .replace(/-|_/g, ' ')
        .replace(/\.[^/.]+$/, '') // Remove file extension
        .trim() || urlObj.hostname;
    } catch {
      return url;
    }
  }

  private isLinkInQueue(url: string): boolean {
    return this.queue.some(item => item.url === url);
  }

  private hasReachedMaxDepth(): boolean {
    return this.queue.some(item => item.depth >= this.MAX_DEPTH);
  }

  private reset(): void {
    this.visited.clear();
    this.queue = [];
    this.baseUrl = '';
    this.processedCount = 0;
    this.urlRetries.clear();
  }

  onCrawlStarted(callback: (data: { startUrl: string; maxPages: number }) => void): void {
    this.eventEmitter.on('crawlStarted', callback);
  }

  onProcessingPage(callback: (data: { url: string; current: number; total: number; depth: number }) => void): void {
    this.eventEmitter.on('processingPage', callback);
  }

  onPageProcessed(callback: (data: { url: string; contentLength: number; newLinks: number; depth: number }) => void): void {
    this.eventEmitter.on('pageProcessed', callback);
  }

  onPageSkipped(callback: (data: { url: string; reason: string; depth: number }) => void): void {
    this.eventEmitter.on('pageSkipped', callback);
  }

  onPageError(callback: (data: { url: string; error: string; depth: number }) => void): void {
    this.eventEmitter.on('pageError', callback);
  }

  onDocumentAdded(callback: (data: { url: string; documentId: string; contentLength: number; depth: number }) => void): void {
    this.eventEmitter.on('documentAdded', callback);
  }

  onDocumentError(callback: (data: { url: string; error: string }) => void): void {
    this.eventEmitter.on('documentError', callback);
  }

  onCrawlCompleted(callback: (data: { pagesProcessed: number; totalPages: number; baseUrl: string; maxDepthReached: boolean }) => void): void {
    this.eventEmitter.on('crawlCompleted', callback);
  }

  onCrawlError(callback: (data: { error: string }) => void): void {
    this.eventEmitter.on('crawlError', callback);
  }
}