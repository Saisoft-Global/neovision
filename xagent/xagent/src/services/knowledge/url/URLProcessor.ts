import { CORSProxy } from './CORSProxy';
import { HTMLExtractor } from './HTMLExtractor';
import { isValidUrl } from '../../../utils/validation';
import { sanitizeContent } from '../../document/utils/sanitization';

export class URLProcessor {
  private htmlExtractor: HTMLExtractor;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly MAX_REDIRECTS = 5;
  private readonly MIN_CONTENT_LENGTH = 100;

  constructor() {
    this.htmlExtractor = new HTMLExtractor();
  }

  async fetchAndProcess(url: string): Promise<string> {
    if (!url?.trim() || !isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    let content: string | null = null;
    let lastError: Error | null = null;
    let redirectCount = 0;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const proxiedUrl = CORSProxy.getProxiedUrl(url);
        
        const response = await this.fetchWithTimeout(proxiedUrl);
        
        if (response.redirected) {
          redirectCount++;
          if (redirectCount > this.MAX_REDIRECTS) {
            throw new Error('Too many redirects');
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() || '';
        
        if (contentType.includes('text/html')) {
          const html = await response.text();
          if (!html?.trim()) {
            throw new Error('Empty HTML response');
          }
          content = this.htmlExtractor.extractContent(html);
        } else if (contentType.includes('text/plain')) {
          content = await response.text();
        } else if (contentType.includes('application/json')) {
          const json = await response.json();
          content = JSON.stringify(json, null, 2);
        } else {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        content = sanitizeContent(content || '');
        if (!content || content.length < this.MIN_CONTENT_LENGTH) {
          throw new Error('Insufficient content extracted');
        }

        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt + 1} failed for ${url}:`, lastError.message);
        
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!content) {
      throw lastError || new Error('Failed to extract content after all retries');
    }

    return content;
  }

  async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/json,text/plain,text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0; +https://github.com/knowledgebot)',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.TIMEOUT}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}