import { sanitizeContent } from '../../utils/sanitization';

export class HTMLExtractor {
  extractContent(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove unwanted elements
    this.removeElements(doc, [
      'script',
      'style',
      'iframe',
      'nav',
      'footer',
      'header',
      'aside',
      'noscript',
      'svg',
    ]);

    // Try to find main content
    const mainContent = this.findMainContent(doc);
    if (mainContent) {
      return sanitizeContent(mainContent);
    }

    // Fallback to body content
    return sanitizeContent(doc.body.textContent || '');
  }

  private removeElements(doc: Document, selectors: string[]): void {
    selectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  private findMainContent(doc: Document): string | null {
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '#content',
      '.content',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 100) {
          return text;
        }
      }
    }

    return null;
  }
}