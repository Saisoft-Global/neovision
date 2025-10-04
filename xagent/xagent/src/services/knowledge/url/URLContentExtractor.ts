import { sanitizeContent } from '../../document/utils/sanitization';
import { CORSProxy } from './CORSProxy';

export class URLContentExtractor {
  async extractContent(url: string): Promise<string> {
    try {
      // Use CORS proxy
      const proxiedUrl = CORSProxy.getProxiedUrl(url);
      
      const response = await fetch(proxiedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Use DOMParser instead of JSDOM for browser environment
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove unwanted elements
      ['script', 'style', 'iframe', 'nav', 'footer', 'header', 'aside', 'noscript'].forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Try to find main content
      const mainContent = 
        doc.querySelector('article')?.textContent ||
        doc.querySelector('main')?.textContent ||
        doc.querySelector('[role="main"]')?.textContent ||
        doc.querySelector('.article-content')?.textContent ||
        doc.querySelector('.post-content')?.textContent ||
        doc.querySelector('#content')?.textContent ||
        doc.querySelector('.content')?.textContent ||
        doc.body.textContent || '';

      const sanitized = sanitizeContent(mainContent);

      if (!sanitized) {
        throw new Error('No content could be extracted from URL');
      }

      return sanitized;
    } catch (error) {
      console.error('Content extraction error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to extract content: ${error.message}`
          : 'Failed to extract content from URL'
      );
    }
  }
}