import { sanitizeContent } from '../../document/utils/sanitization';

export class HTMLExtractor {
  private readonly MIN_CONTENT_LENGTH = 100;

  extractContent(html: string): string {
    if (!html?.trim()) {
      throw new Error('Empty HTML content');
    }

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
      'form',
      'meta',
      '[role="navigation"]',
      '[role="complementary"]',
      '.nav',
      '.footer',
      '.header',
      '.sidebar',
      '.ad',
      '.advertisement',
      '.social-share',
      '.comments',
      '.cookie-notice',
      '.newsletter',
      '.popup',
      '.modal',
      '#cookie-banner',
      '#newsletter-popup',
      '.navigation',
      '.menu',
    ]);

    // Try to find main content
    const mainContent = this.findMainContent(doc);
    if (mainContent) {
      const content = sanitizeContent(mainContent);
      if (content.length >= this.MIN_CONTENT_LENGTH) {
        return content;
      }
    }

    // Fallback to smart content extraction
    return this.extractBodyContent(doc);
  }

  private removeElements(doc: Document, selectors: string[]): void {
    selectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  private findMainContent(doc: Document): string | null {
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '#content',
      '.content',
      '.main-content',
      '.entry-content',
      '.post',
      '.article',
      '.blog-post',
      '[itemprop="articleBody"]',
      '.page-content',
    ];

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length >= this.MIN_CONTENT_LENGTH) {
          return text;
        }
      }
    }

    return null;
  }

  private extractBodyContent(doc: Document): string {
    // Get all text nodes
    const textNodes: string[] = [];
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if parent is hidden
          const parent = node.parentElement;
          if (!parent || this.isHiddenElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip if text is too short
          const text = node.textContent?.trim() || '';
          if (text.length < 20) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip if parent has certain classes/attributes
          if (this.isUnwantedElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) {
        textNodes.push(text);
      }
    }

    // Join text nodes with proper spacing
    const content = textNodes
      .map(text => text.replace(/\s+/g, ' ').trim())
      .filter(text => text.length > 0)
      .join('\n\n');

    const sanitized = sanitizeContent(content);
    if (sanitized.length < this.MIN_CONTENT_LENGTH) {
      throw new Error('Insufficient content found in document');
    }

    return sanitized;
  }

  private isHiddenElement(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || 
           style.visibility === 'hidden' || 
           style.opacity === '0';
  }

  private isUnwantedElement(element: Element): boolean {
    const classNames = element.className.toLowerCase();
    const role = element.getAttribute('role')?.toLowerCase();
    
    return (
      classNames.includes('nav') ||
      classNames.includes('footer') ||
      classNames.includes('header') ||
      classNames.includes('sidebar') ||
      classNames.includes('menu') ||
      classNames.includes('ad') ||
      classNames.includes('comment') ||
      role?.includes('navigation') ||
      role?.includes('complementary') ||
      element.tagName === 'NAV' ||
      element.tagName === 'FOOTER' ||
      element.tagName === 'HEADER'
    );
  }
}