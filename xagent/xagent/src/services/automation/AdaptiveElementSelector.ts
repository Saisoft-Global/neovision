import { Page, ElementHandle } from 'playwright';
import { createChatCompletion } from '../openai/chat';
import { UniversalWebsiteAnalyzer, WebsiteStructure } from './UniversalWebsiteAnalyzer';

export interface ElementInfo {
  element: ElementHandle;
  selector: string;
  text: string;
  attributes: Record<string, string>;
  position: { x: number; y: number };
  visibility: 'visible' | 'hidden' | 'partially_visible';
  confidence: number;
  alternativeSelectors: string[];
  context: string;
  description: string;
}

export interface ElementContext {
  pageUrl: string;
  pageTitle: string;
  elementType: string;
  surroundingText: string;
  parentElements: string[];
  siblingElements: string[];
  pageSection: string;
}

export interface RobustSelector {
  primary: SelectorInfo;
  alternatives: SelectorInfo[];
  fallback: SelectorInfo;
  strategy: 'id' | 'class' | 'text' | 'position' | 'semantic' | 'ai_generated';
}

export interface SelectorInfo {
  selector: string;
  strategy: string;
  robustness: number;
  confidence: number;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  error?: string;
  alternatives?: string[];
}

export interface ElementSearchResult {
  element: ElementHandle | null;
  selector: string;
  confidence: number;
  strategy: string;
  alternatives: string[];
  context: ElementContext;
}

export class AdaptiveElementSelector {
  private static instance: AdaptiveElementSelector;
  private websiteAnalyzer: UniversalWebsiteAnalyzer;
  private selectorCache: Map<string, RobustSelector> = new Map();

  public static getInstance(): AdaptiveElementSelector {
    if (!AdaptiveElementSelector.instance) {
      AdaptiveElementSelector.instance = new AdaptiveElementSelector();
    }
    return AdaptiveElementSelector.instance;
  }

  constructor() {
    this.websiteAnalyzer = UniversalWebsiteAnalyzer.getInstance();
  }

  async findElement(page: Page, description: string): Promise<ElementSearchResult> {
    console.log(`🔍 Finding element: "${description}"`);
    
    try {
      // Try multiple strategies in order of preference
      const strategies = [
        () => this.findByTextContent(page, description),
        () => this.findBySemanticMeaning(page, description),
        () => this.findByVisualContext(page, description),
        () => this.findByAIUnderstanding(page, description),
        () => this.findByElementType(page, description)
      ];

      for (const strategy of strategies) {
        try {
          const result = await strategy();
          if (result && await this.validateElement(result.element, page)) {
            console.log(`✅ Element found using ${result.strategy} strategy (confidence: ${result.confidence})`);
            return result;
          }
        } catch (error) {
          console.warn(`Strategy ${strategy.name} failed:`, error);
        }
      }

      throw new Error(`Could not find element: ${description}`);
      
    } catch (error) {
      console.error(`❌ Failed to find element: "${description}"`, error);
      throw error;
    }
  }

  private async findByTextContent(page: Page, description: string): Promise<ElementSearchResult | null> {
    try {
      // Try exact text match
      const exactMatch = await page.$(`text="${description}"`);
      if (exactMatch) {
        return {
          element: exactMatch,
          selector: `text="${description}"`,
          confidence: 0.9,
          strategy: 'exact_text',
          alternatives: [],
          context: await this.getElementContext(exactMatch, page)
        };
      }

      // Try partial text match
      const partialMatch = await page.$(`text=/.*${description}.*/i`);
      if (partialMatch) {
        return {
          element: partialMatch,
          selector: `text=/.*${description}.*/i`,
          confidence: 0.8,
          strategy: 'partial_text',
          alternatives: [],
          context: await this.getElementContext(partialMatch, page)
        };
      }

      // Try case-insensitive match
      const caseInsensitiveMatch = await page.$(`text=/.*${description}.*/i`);
      if (caseInsensitiveMatch) {
        return {
          element: caseInsensitiveMatch,
          selector: `text=/.*${description}.*/i`,
          confidence: 0.7,
          strategy: 'case_insensitive_text',
          alternatives: [],
          context: await this.getElementContext(caseInsensitiveMatch, page)
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async findBySemanticMeaning(page: Page, description: string): Promise<ElementSearchResult | null> {
    try {
      // Map common descriptions to semantic selectors
      const semanticMappings: Record<string, string[]> = {
        'login button': ['[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")'],
        'search box': ['input[type="search"]', 'input[placeholder*="search" i]', '[name="q"]'],
        'add to cart': ['button:has-text("Add to Cart")', 'button:has-text("Buy Now")', '.add-to-cart'],
        'contact form': ['form', '[action*="contact"]', '.contact-form'],
        'email input': ['input[type="email"]', 'input[name*="email" i]', '#email'],
        'password input': ['input[type="password"]', 'input[name*="password" i]', '#password'],
        'submit button': ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Submit")'],
        'cancel button': ['button:has-text("Cancel")', 'button:has-text("Close")', '.cancel-btn'],
        'next button': ['button:has-text("Next")', 'button:has-text("Continue")', '.next-btn'],
        'back button': ['button:has-text("Back")', 'button:has-text("Previous")', '.back-btn']
      };

      const lowerDescription = description.toLowerCase();
      
      for (const [key, selectors] of Object.entries(semanticMappings)) {
        if (lowerDescription.includes(key)) {
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                return {
                  element,
                  selector,
                  confidence: 0.8,
                  strategy: 'semantic_mapping',
                  alternatives: selectors.filter(s => s !== selector),
                  context: await this.getElementContext(element, page)
                };
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async findByVisualContext(page: Page, description: string): Promise<ElementSearchResult | null> {
    try {
      // Get all visible elements
      const visibleElements = await page.$$eval('*', (elements) => {
        return elements
          .filter(el => el.offsetParent !== null)
          .map(el => ({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || '',
            className: el.className || '',
            id: el.id || '',
            type: (el as any).type || '',
            placeholder: el.placeholder || '',
            href: el.href || '',
            rect: el.getBoundingClientRect(),
            visible: el.offsetParent !== null
          }));
      });

      // Use AI to find the best match based on visual context
      const systemPrompt = `Find the element that best matches this description: "${description}"

      Available visible elements: ${JSON.stringify(visibleElements, null, 2)}

      Consider:
      1. Text content matching
      2. Element type (button, input, link, etc.)
      3. Visual position and context
      4. Semantic meaning

      Return the index of the best matching element:
      {"index": 5, "confidence": 0.9, "reasoning": "This button contains 'Add to Cart' text and is positioned prominently on the page"}`;

      try {
        const response = await createChatCompletion([
          { role: 'system', content: systemPrompt }
        ]);

        const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
        
        if (result.confidence > 0.6 && result.index < visibleElements.length) {
          const elementInfo = visibleElements[result.index];
          const element = await page.$(`*:nth-child(${result.index + 1})`);
          
          if (element) {
            return {
              element,
              selector: this.generateSelectorFromElement(elementInfo),
              confidence: result.confidence,
              strategy: 'visual_context',
              alternatives: [],
              context: await this.getElementContext(element, page)
            };
          }
        }
      } catch (error) {
        console.warn('AI-based visual context search failed:', error);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async findByAIUnderstanding(page: Page, description: string): Promise<ElementSearchResult | null> {
    try {
      // Get comprehensive element information
      const elements = await page.$$eval('*', (elements) => {
        return elements.map((el, index) => ({
          index,
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim() || '',
          placeholder: el.placeholder || '',
          id: el.id || '',
          className: el.className || '',
          name: el.name || '',
          type: (el as any).type || '',
          href: el.href || '',
          role: el.getAttribute('role') || '',
          visible: el.offsetParent !== null,
          rect: el.getBoundingClientRect(),
          parent: el.parentElement?.tagName.toLowerCase() || '',
          parentClass: el.parentElement?.className || ''
        }));
      });

      const systemPrompt = `Find the element that best matches this description: "${description}"

      Available elements: ${JSON.stringify(elements, null, 2)}

      Analyze each element and return the one that best matches the description.
      Consider text content, element type, attributes, and context.

      Return JSON:
      {"index": 5, "confidence": 0.9, "reasoning": "This button contains 'Add to Cart' text which matches the purchase intent", "selector": "button:has-text('Add to Cart')"}`;

      try {
        const response = await createChatCompletion([
          { role: 'system', content: systemPrompt }
        ]);

        const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
        
        if (result.confidence > 0.7 && result.index < elements.length) {
          const elementInfo = elements[result.index];
          const element = await page.$(`*:nth-child(${result.index + 1})`);
          
          if (element) {
            return {
              element,
              selector: result.selector || this.generateSelectorFromElement(elementInfo),
              confidence: result.confidence,
              strategy: 'ai_understanding',
              alternatives: this.generateAlternativeSelectors(elementInfo),
              context: await this.getElementContext(element, page)
            };
          }
        }
      } catch (error) {
        console.warn('AI-based element search failed:', error);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async findByElementType(page: Page, description: string): Promise<ElementSearchResult | null> {
    try {
      const lowerDescription = description.toLowerCase();
      
      // Map descriptions to element types
      const typeMappings: Record<string, string[]> = {
        'button': ['button', 'input[type="button"]', 'input[type="submit"]'],
        'input': ['input', 'textarea', 'select'],
        'form': ['form'],
        'link': ['a[href]'],
        'image': ['img'],
        'text': ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      };

      for (const [type, selectors] of Object.entries(typeMappings)) {
        if (lowerDescription.includes(type)) {
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                return {
                  element,
                  selector,
                  confidence: 0.6,
                  strategy: 'element_type',
                  alternatives: selectors.filter(s => s !== selector),
                  context: await this.getElementContext(element, page)
                };
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async generateRobustSelector(element: ElementHandle, page: Page): Promise<RobustSelector> {
    const elementInfo = await this.getElementInfo(element);
    const cacheKey = `${page.url()}_${elementInfo.id || elementInfo.text}`;
    
    // Check cache
    if (this.selectorCache.has(cacheKey)) {
      return this.selectorCache.get(cacheKey)!;
    }

    try {
      // Generate multiple selector strategies
      const selectors = await Promise.all([
        this.generateIdSelector(elementInfo),
        this.generateClassSelector(elementInfo),
        this.generateTextSelector(elementInfo),
        this.generatePositionSelector(elementInfo),
        this.generateSemanticSelector(elementInfo),
        this.generateAISelector(elementInfo, page)
      ]);

      // Filter out null selectors and rank by robustness
      const validSelectors = selectors
        .filter(s => s !== null)
        .sort((a, b) => b.robustness - a.robustness);

      const robustSelector: RobustSelector = {
        primary: validSelectors[0] || this.generateFallbackSelector(elementInfo),
        alternatives: validSelectors.slice(1),
        fallback: this.generateFallbackSelector(elementInfo),
        strategy: validSelectors[0]?.strategy as any || 'fallback'
      };

      // Cache the result
      this.selectorCache.set(cacheKey, robustSelector);
      
      return robustSelector;
      
    } catch (error) {
      console.error('Failed to generate robust selector:', error);
      return this.generateFallbackSelector(elementInfo);
    }
  }

  private async generateIdSelector(elementInfo: any): Promise<SelectorInfo | null> {
    if (!elementInfo.id) return null;
    
    return {
      selector: `#${elementInfo.id}`,
      strategy: 'id',
      robustness: 0.9,
      confidence: 0.9,
      description: `ID selector: #${elementInfo.id}`
    };
  }

  private async generateClassSelector(elementInfo: any): Promise<SelectorInfo | null> {
    if (!elementInfo.className) return null;
    
    const classes = elementInfo.className.split(' ').filter((cls: string) => cls.trim());
    if (classes.length === 0) return null;
    
    // Use the most specific class
    const primaryClass = classes[0];
    
    return {
      selector: `.${primaryClass}`,
      strategy: 'class',
      robustness: 0.7,
      confidence: 0.8,
      description: `Class selector: .${primaryClass}`
    };
  }

  private async generateTextSelector(elementInfo: any): Promise<SelectorInfo | null> {
    if (!elementInfo.text) return null;
    
    return {
      selector: `text="${elementInfo.text}"`,
      strategy: 'text',
      robustness: 0.8,
      confidence: 0.9,
      description: `Text selector: "${elementInfo.text}"`
    };
  }

  private async generatePositionSelector(elementInfo: any): Promise<SelectorInfo | null> {
    if (!elementInfo.index) return null;
    
    return {
      selector: `*:nth-child(${elementInfo.index + 1})`,
      strategy: 'position',
      robustness: 0.3,
      confidence: 0.6,
      description: `Position selector: nth-child(${elementInfo.index + 1})`
    };
  }

  private async generateSemanticSelector(elementInfo: any): Promise<SelectorInfo | null> {
    const tag = elementInfo.tag;
    const type = elementInfo.type;
    
    if (tag === 'input' && type) {
      return {
        selector: `input[type="${type}"]`,
        strategy: 'semantic',
        robustness: 0.6,
        confidence: 0.7,
        description: `Semantic selector: input[type="${type}"]`
      };
    }
    
    if (tag === 'button') {
      return {
        selector: 'button',
        strategy: 'semantic',
        robustness: 0.5,
        confidence: 0.6,
        description: 'Semantic selector: button'
      };
    }
    
    return null;
  }

  private async generateAISelector(elementInfo: any, page: Page): Promise<SelectorInfo | null> {
    try {
      const systemPrompt = `Generate a robust CSS selector for this element:

      Element Info: ${JSON.stringify(elementInfo, null, 2)}

      Consider:
      1. Uniqueness - should uniquely identify this element
      2. Stability - should work even if page structure changes slightly
      3. Readability - should be human-readable
      4. Performance - should be fast to execute

      Return JSON:
      {"selector": "css_selector", "robustness": 0.9, "strategy": "ai_generated", "confidence": 0.8, "description": "AI-generated selector"}`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      
      return {
        selector: result.selector,
        strategy: 'ai_generated',
        robustness: result.robustness || 0.8,
        confidence: result.confidence || 0.8,
        description: result.description || 'AI-generated selector'
      };
    } catch (error) {
      console.warn('Failed to generate AI selector:', error);
      return null;
    }
  }

  private generateFallbackSelector(elementInfo: any): SelectorInfo {
    return {
      selector: `*[data-index="${elementInfo.index}"]`,
      strategy: 'fallback',
      robustness: 0.1,
      confidence: 0.5,
      description: 'Fallback selector using data-index'
    };
  }

  async validateSelector(selector: string, page: Page): Promise<ValidationResult> {
    try {
      const element = await page.$(selector);
      
      if (element) {
        // Check if element is visible
        const isVisible = await element.isVisible();
        
        return {
          isValid: true,
          confidence: isVisible ? 0.9 : 0.6,
          alternatives: []
        };
      }
      
      return {
        isValid: false,
        confidence: 0,
        error: 'Element not found',
        alternatives: []
      };
      
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Validation failed',
        alternatives: []
      };
    }
  }

  private async validateElement(element: ElementHandle | null, page: Page): Promise<boolean> {
    if (!element) return false;
    
    try {
      return await element.isVisible();
    } catch (error) {
      return false;
    }
  }

  private async getElementInfo(element: ElementHandle): Promise<any> {
    return await element.evaluate((el) => ({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim() || '',
      placeholder: el.placeholder || '',
      id: el.id || '',
      className: el.className || '',
      name: el.name || '',
      type: (el as any).type || '',
      href: el.href || '',
      role: el.getAttribute('role') || '',
      visible: el.offsetParent !== null,
      rect: el.getBoundingClientRect(),
      parent: el.parentElement?.tagName.toLowerCase() || '',
      parentClass: el.parentElement?.className || ''
    }));
  }

  private async getElementContext(element: ElementHandle, page: Page): Promise<ElementContext> {
    const pageUrl = page.url();
    const pageTitle = await page.title();
    
    const context = await element.evaluate((el) => ({
      elementType: el.tagName.toLowerCase(),
      surroundingText: el.textContent?.trim() || '',
      parentElements: [
        el.parentElement?.tagName.toLowerCase() || '',
        el.parentElement?.parentElement?.tagName.toLowerCase() || ''
      ].filter(Boolean),
      siblingElements: Array.from(el.parentElement?.children || [])
        .filter(child => child !== el)
        .map(child => child.tagName.toLowerCase()),
      pageSection: el.closest('section, article, main, header, footer, nav')?.tagName.toLowerCase() || 'body'
    }));
    
    return {
      pageUrl,
      pageTitle,
      ...context
    };
  }

  private generateSelectorFromElement(elementInfo: any): string {
    if (elementInfo.id) return `#${elementInfo.id}`;
    if (elementInfo.className) return `.${elementInfo.className.split(' ')[0]}`;
    if (elementInfo.text) return `text="${elementInfo.text}"`;
    return `*:nth-child(${elementInfo.index + 1})`;
  }

  private generateAlternativeSelectors(elementInfo: any): string[] {
    const alternatives: string[] = [];
    
    if (elementInfo.id) alternatives.push(`#${elementInfo.id}`);
    if (elementInfo.className) {
      elementInfo.className.split(' ').forEach((cls: string) => {
        if (cls) alternatives.push(`.${cls}`);
      });
    }
    if (elementInfo.text) alternatives.push(`text="${elementInfo.text}"`);
    if (elementInfo.name) alternatives.push(`[name="${elementInfo.name}"]`);
    if (elementInfo.type) alternatives.push(`[type="${elementInfo.type}"]`);
    
    return alternatives;
  }

  async findElementsByContext(page: Page, context: ElementContext): Promise<ElementInfo[]> {
    // Implementation for finding elements by context
    const elements: ElementInfo[] = [];
    
    try {
      // This would implement context-based element finding
      // For now, return empty array
      return elements;
    } catch (error) {
      console.error('Failed to find elements by context:', error);
      return elements;
    }
  }

  async getElementSuggestions(page: Page, partialDescription: string): Promise<string[]> {
    const structure = await this.websiteAnalyzer.analyzeWebsite(page);
    const suggestions: string[] = [];
    
    // Get suggestions from buttons
    structure.elements.buttons.forEach(button => {
      if (button.text.toLowerCase().includes(partialDescription.toLowerCase())) {
        suggestions.push(`Button: "${button.text}"`);
      }
    });
    
    // Get suggestions from inputs
    structure.elements.inputs.forEach(input => {
      if (input.label.toLowerCase().includes(partialDescription.toLowerCase()) ||
          input.placeholder.toLowerCase().includes(partialDescription.toLowerCase())) {
        suggestions.push(`Input: "${input.label || input.placeholder}"`);
      }
    });
    
    // Get suggestions from links
    structure.elements.links.forEach(link => {
      if (link.text.toLowerCase().includes(partialDescription.toLowerCase())) {
        suggestions.push(`Link: "${link.text}"`);
      }
    });
    
    return suggestions;
  }
}
