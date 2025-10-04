import { CORSProxy } from './CORSProxy';
import { HTMLExtractor } from './HTMLExtractor';

export class URLProcessor {
  private htmlExtractor: HTMLExtractor;

  constructor() {
    this.htmlExtractor = new HTMLExtractor();
  }

  async fetchAndProcess(url: string): Promise<string> {
    try {
      // Add CORS proxy
      const proxiedUrl = CORSProxy.getProxiedUrl(url);
      
      // Fetch with timeout
      const response = await this.fetchWithTimeout(proxiedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        const html = await response.text();
        return this.htmlExtractor.extractContent(html);
      } else if (contentType.includes('text/plain')) {
        return response.text();
      } else if (contentType.includes('application/json')) {
        const json = await response.json();
        return JSON.stringify(json, null, 2);
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      console.error('URL processing error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to process URL: ${error.message}`
          : 'Failed to process URL'
      );
    }
  }

  private async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/json,text/plain',
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)',
        },
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}