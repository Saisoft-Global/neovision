import { Page, ElementHandle } from 'playwright';
import { createChatCompletion } from '../openai/chat';

export interface WebsiteStructure {
  pageType: 'login' | 'form' | 'ecommerce' | 'dashboard' | 'search' | 'content' | 'unknown';
  elements: WebsiteElements;
  patterns: WebsitePattern[];
  confidence: number;
  url: string;
  title: string;
  language: string;
}

export interface WebsiteElements {
  forms: FormElement[];
  buttons: ButtonElement[];
  inputs: InputElement[];
  links: LinkElement[];
  content: ContentElement[];
  navigation: NavigationElement[];
}

export interface FormElement {
  id: string;
  selector: string;
  type: 'login' | 'contact' | 'search' | 'registration' | 'payment' | 'unknown';
  fields: FormField[];
  submitButton?: ButtonElement;
  confidence: number;
}

export interface ButtonElement {
  id: string;
  selector: string;
  text: string;
  type: 'submit' | 'link' | 'action' | 'navigation' | 'unknown';
  context: string;
  confidence: number;
  alternatives: string[];
}

export interface InputElement {
  id: string;
  selector: string;
  type: string;
  placeholder: string;
  label: string;
  required: boolean;
  context: string;
  confidence: number;
}

export interface LinkElement {
  id: string;
  selector: string;
  text: string;
  href: string;
  context: string;
  confidence: number;
}

export interface ContentElement {
  id: string;
  selector: string;
  text: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'unknown';
  context: string;
  confidence: number;
}

export interface NavigationElement {
  id: string;
  selector: string;
  text: string;
  level: number;
  parent?: string;
  children: string[];
  confidence: number;
}

export interface WebsitePattern {
  type: 'layout' | 'interaction' | 'navigation' | 'data_entry' | 'content_display';
  description: string;
  confidence: number;
  elements: string[];
}

export interface ElementContext {
  pageUrl: string;
  pageTitle: string;
  elementType: string;
  surroundingText: string;
  parentElements: string[];
  siblingElements: string[];
}

export class UniversalWebsiteAnalyzer {
  private static instance: UniversalWebsiteAnalyzer;
  private analysisCache: Map<string, WebsiteStructure> = new Map();

  public static getInstance(): UniversalWebsiteAnalyzer {
    if (!UniversalWebsiteAnalyzer.instance) {
      UniversalWebsiteAnalyzer.instance = new UniversalWebsiteAnalyzer();
    }
    return UniversalWebsiteAnalyzer.instance;
  }

  async analyzeWebsite(page: Page): Promise<WebsiteStructure> {
    const url = page.url();
    const cacheKey = `${url}_${Date.now()}`;
    
    // Check cache for recent analysis
    if (this.analysisCache.has(url)) {
      const cached = this.analysisCache.get(url)!;
      if (Date.now() - parseInt(cacheKey.split('_')[1]) < 300000) { // 5 minutes
        return cached;
      }
    }

    try {
      console.log(`🔍 Analyzing website: ${url}`);
      
      // 1. Get basic page information
      const title = await page.title();
      const language = await this.detectPageLanguage(page);
      
      // 2. Analyze page structure
      const pageAnalysis = await this.analyzePageStructure(page);
      
      // 3. Identify page type using AI
      const pageType = await this.identifyPageType(page, pageAnalysis);
      
      // 4. Extract interactive elements
      const elements = await this.extractInteractiveElements(page);
      
      // 5. Identify website patterns
      const patterns = await this.identifyWebsitePatterns(page, elements);
      
      // 6. Calculate overall confidence
      const confidence = this.calculateConfidence(pageAnalysis, elements, patterns);
      
      const structure: WebsiteStructure = {
        pageType,
        elements,
        patterns,
        confidence,
        url,
        title,
        language
      };

      // Cache the analysis
      this.analysisCache.set(url, structure);
      
      console.log(`✅ Website analysis complete. Type: ${pageType}, Confidence: ${confidence}`);
      return structure;
      
    } catch (error) {
      console.error('❌ Website analysis failed:', error);
      throw new Error(`Failed to analyze website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzePageStructure(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const structure = {
        totalElements: elements.length,
        interactiveElements: 0,
        formElements: 0,
        buttonElements: 0,
        inputElements: 0,
        linkElements: 0,
        hasLoginForm: false,
        hasSearchForm: false,
        hasContactForm: false,
        hasShoppingCart: false,
        hasNavigation: false,
        pageHeight: document.body.scrollHeight,
        pageWidth: document.body.scrollWidth,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      };

      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const type = (el as any).type?.toLowerCase();
        const className = el.className?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        const text = el.textContent?.toLowerCase() || '';

        if (['input', 'button', 'select', 'textarea', 'a'].includes(tagName)) {
          structure.interactiveElements++;
        }

        if (tagName === 'form') {
          structure.formElements++;
        }

        if (tagName === 'button' || (tagName === 'input' && ['submit', 'button'].includes(type))) {
          structure.buttonElements++;
        }

        if (tagName === 'input' && !['submit', 'button'].includes(type)) {
          structure.inputElements++;
        }

        if (tagName === 'a' && (el as any).href) {
          structure.linkElements++;
        }

        // Check for specific patterns
        if (text.includes('login') || text.includes('sign in') || text.includes('password')) {
          structure.hasLoginForm = true;
        }

        if (text.includes('search') || className.includes('search') || id.includes('search')) {
          structure.hasSearchForm = true;
        }

        if (text.includes('contact') || text.includes('message') || text.includes('enquiry')) {
          structure.hasContactForm = true;
        }

        if (text.includes('cart') || text.includes('basket') || text.includes('checkout')) {
          structure.hasShoppingCart = true;
        }

        if (tagName === 'nav' || className.includes('nav') || id.includes('nav')) {
          structure.hasNavigation = true;
        }
      });

      return structure;
    });
  }

  private async identifyPageType(page: Page, pageAnalysis: any): Promise<WebsiteStructure['pageType']> {
    const systemPrompt = `Analyze this website page and determine its primary type:

    Page URL: ${page.url()}
    Page Title: ${await page.title()}
    Page Analysis: ${JSON.stringify(pageAnalysis, null, 2)}

    Based on the analysis, classify this page as one of:
    - login: Authentication pages with username/password fields
    - form: Data entry forms (contact, registration, application, etc.)
    - ecommerce: Shopping/product pages with cart functionality
    - dashboard: Admin/control panels with data visualization
    - search: Search result pages or search interfaces
    - content: Informational/read-only pages (blogs, articles, etc.)
    - unknown: Cannot determine the page type

    Consider these indicators:
    - login: Has password fields, "sign in" text, authentication forms
    - form: Multiple input fields, submit buttons, data collection
    - ecommerce: Shopping cart, product listings, checkout buttons
    - dashboard: Charts, tables, admin controls, data visualization
    - search: Search input, result listings, filter options
    - content: Mostly text, images, articles, informational content

    Return JSON: {"type": "page_type", "confidence": 0.9, "reasoning": "explanation"}`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze this page and classify its type.' }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      return result.type || 'unknown';
    } catch (error) {
      console.warn('Failed to identify page type with AI, using heuristics:', error);
      return this.identifyPageTypeWithHeuristics(pageAnalysis);
    }
  }

  private identifyPageTypeWithHeuristics(pageAnalysis: any): WebsiteStructure['pageType'] {
    if (pageAnalysis.hasLoginForm && pageAnalysis.inputElements >= 2) {
      return 'login';
    }
    if (pageAnalysis.hasShoppingCart || pageAnalysis.formElements > 0 && pageAnalysis.hasShoppingCart) {
      return 'ecommerce';
    }
    if (pageAnalysis.formElements > 0 && pageAnalysis.inputElements > 2) {
      return 'form';
    }
    if (pageAnalysis.hasSearchForm) {
      return 'search';
    }
    if (pageAnalysis.interactiveElements < 10 && pageAnalysis.formElements === 0) {
      return 'content';
    }
    return 'unknown';
  }

  private async extractInteractiveElements(page: Page): Promise<WebsiteElements> {
    console.log('🔍 Extracting interactive elements...');
    
    const elements = await page.$$eval('input, button, select, textarea, a[href], [onclick], [role="button"], form', (elements) => {
      return elements.map((el, index) => ({
        index,
        tag: el.tagName.toLowerCase(),
        type: (el as any).type || 'button',
        text: el.textContent?.trim() || '',
        placeholder: el.placeholder || '',
        id: el.id || '',
        className: el.className || '',
        name: el.name || '',
        href: el.href || '',
        role: el.getAttribute('role') || '',
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect(),
        parent: el.parentElement?.tagName.toLowerCase() || '',
        parentClass: el.parentElement?.className || ''
      }));
    });

    // Categorize elements using AI
    const forms = await this.categorizeForms(elements);
    const buttons = await this.categorizeButtons(elements);
    const inputs = await this.categorizeInputs(elements);
    const links = await this.categorizeLinks(elements);
    const content = await this.categorizeContent(elements);
    const navigation = await this.categorizeNavigation(elements);

    return {
      forms,
      buttons,
      inputs,
      links,
      content,
      navigation
    };
  }

  private async categorizeForms(elements: any[]): Promise<FormElement[]> {
    const formElements = elements.filter(el => el.tag === 'form');
    const forms: FormElement[] = [];

    for (const formEl of formElements) {
      try {
        const formType = await this.identifyFormType(formEl);
        const fields = await this.extractFormFields(formEl);
        const submitButton = await this.findSubmitButton(formEl, elements);

        forms.push({
          id: `form_${formEl.index}`,
          selector: this.generateSelector(formEl),
          type: formType,
          fields,
          submitButton,
          confidence: this.calculateElementConfidence(formEl)
        });
      } catch (error) {
        console.warn('Failed to categorize form:', error);
      }
    }

    return forms;
  }

  private async identifyFormType(formEl: any): Promise<FormElement['type']> {
    const systemPrompt = `Identify the type of this form:

    Form Element: ${JSON.stringify(formEl, null, 2)}

    Classify as one of:
    - login: Authentication form with username/password
    - contact: Contact form for inquiries
    - search: Search form for finding content
    - registration: User registration/signup form
    - payment: Payment/checkout form
    - unknown: Cannot determine form type

    Return JSON: {"type": "form_type", "confidence": 0.9}`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      return result.type || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async extractFormFields(formEl: any): Promise<FormField[]> {
    // This would extract form fields - simplified for now
    return [];
  }

  private async findSubmitButton(formEl: any, elements: any[]): Promise<ButtonElement | undefined> {
    // Find submit button associated with this form
    return undefined;
  }

  private async categorizeButtons(elements: any[]): Promise<ButtonElement[]> {
    const buttonElements = elements.filter(el => 
      el.tag === 'button' || 
      (el.tag === 'input' && ['submit', 'button'].includes(el.type)) ||
      el.role === 'button'
    );

    const buttons: ButtonElement[] = [];

    for (const buttonEl of buttonElements) {
      try {
        const buttonType = await this.identifyButtonType(buttonEl);
        const alternatives = this.generateAlternativeSelectors(buttonEl);

        buttons.push({
          id: `button_${buttonEl.index}`,
          selector: this.generateSelector(buttonEl),
          text: buttonEl.text,
          type: buttonType,
          context: this.getElementContext(buttonEl),
          confidence: this.calculateElementConfidence(buttonEl),
          alternatives
        });
      } catch (error) {
        console.warn('Failed to categorize button:', error);
      }
    }

    return buttons;
  }

  private async identifyButtonType(buttonEl: any): Promise<ButtonElement['type']> {
    const systemPrompt = `Identify the type of this button:

    Button Element: ${JSON.stringify(buttonEl, null, 2)}

    Classify as one of:
    - submit: Form submission button
    - link: Navigation/link button
    - action: Action button (add, delete, edit, etc.)
    - navigation: Navigation/menu button
    - unknown: Cannot determine button type

    Return JSON: {"type": "button_type", "confidence": 0.9}`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      return result.type || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async categorizeInputs(elements: any[]): Promise<InputElement[]> {
    const inputElements = elements.filter(el => 
      el.tag === 'input' && !['submit', 'button'].includes(el.type)
    );

    const inputs: InputElement[] = [];

    for (const inputEl of inputElements) {
      try {
        const label = await this.findInputLabel(inputEl);
        const required = this.isInputRequired(inputEl);

        inputs.push({
          id: `input_${inputEl.index}`,
          selector: this.generateSelector(inputEl),
          type: inputEl.type,
          placeholder: inputEl.placeholder,
          label,
          required,
          context: this.getElementContext(inputEl),
          confidence: this.calculateElementConfidence(inputEl)
        });
      } catch (error) {
        console.warn('Failed to categorize input:', error);
      }
    }

    return inputs;
  }

  private async findInputLabel(inputEl: any): Promise<string> {
    // Find associated label for input
    return inputEl.placeholder || '';
  }

  private isInputRequired(inputEl: any): boolean {
    // Check if input is required
    return false; // Simplified
  }

  private async categorizeLinks(elements: any[]): Promise<LinkElement[]> {
    const linkElements = elements.filter(el => el.tag === 'a' && el.href);

    const links: LinkElement[] = [];

    for (const linkEl of linkElements) {
      try {
        links.push({
          id: `link_${linkEl.index}`,
          selector: this.generateSelector(linkEl),
          text: linkEl.text,
          href: linkEl.href,
          context: this.getElementContext(linkEl),
          confidence: this.calculateElementConfidence(linkEl)
        });
      } catch (error) {
        console.warn('Failed to categorize link:', error);
      }
    }

    return links;
  }

  private async categorizeContent(elements: any[]): Promise<ContentElement[]> {
    // Simplified content categorization
    return [];
  }

  private async categorizeNavigation(elements: any[]): Promise<NavigationElement[]> {
    // Simplified navigation categorization
    return [];
  }

  private async identifyWebsitePatterns(page: Page, elements: WebsiteElements): Promise<WebsitePattern[]> {
    const patterns: WebsitePattern[] = [];

    // Identify common patterns
    if (elements.forms.length > 0) {
      patterns.push({
        type: 'data_entry',
        description: 'Contains forms for data collection',
        confidence: 0.9,
        elements: elements.forms.map(f => f.id)
      });
    }

    if (elements.navigation.length > 0) {
      patterns.push({
        type: 'navigation',
        description: 'Has navigation structure',
        confidence: 0.8,
        elements: elements.navigation.map(n => n.id)
      });
    }

    return patterns;
  }

  private detectPageLanguage(page: Page): Promise<string> {
    return page.evaluate(() => {
      const htmlLang = document.documentElement.lang;
      if (htmlLang) return htmlLang;
      
      // Fallback: analyze page content
      const content = document.body.textContent || '';
      // Simple language detection logic here
      return 'en'; // Default to English
    });
  }

  private generateSelector(element: any): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return `[data-index="${element.index}"]`;
  }

  private generateAlternativeSelectors(element: any): string[] {
    const selectors: string[] = [];
    
    if (element.id) selectors.push(`#${element.id}`);
    if (element.className) {
      element.className.split(' ').forEach((cls: string) => {
        if (cls) selectors.push(`.${cls}`);
      });
    }
    if (element.text) selectors.push(`text="${element.text}"`);
    
    return selectors;
  }

  private getElementContext(element: any): string {
    return `${element.parent} > ${element.tag}`;
  }

  private calculateElementConfidence(element: any): number {
    let confidence = 0.5;
    
    if (element.visible) confidence += 0.2;
    if (element.id) confidence += 0.1;
    if (element.className) confidence += 0.1;
    if (element.text) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private calculateConfidence(pageAnalysis: any, elements: WebsiteElements, patterns: WebsitePattern[]): number {
    let confidence = 0.5;
    
    // Page analysis confidence
    if (pageAnalysis.interactiveElements > 0) confidence += 0.1;
    if (pageAnalysis.formElements > 0) confidence += 0.1;
    if (pageAnalysis.buttonElements > 0) confidence += 0.1;
    
    // Elements confidence
    if (elements.buttons.length > 0) confidence += 0.1;
    if (elements.inputs.length > 0) confidence += 0.1;
    if (elements.forms.length > 0) confidence += 0.1;
    
    // Patterns confidence
    if (patterns.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Public methods for element analysis
  async findElementByDescription(page: Page, description: string): Promise<ElementHandle | null> {
    const structure = await this.analyzeWebsite(page);
    
    // Search through all elements for the best match
    const allElements = [
      ...structure.elements.buttons,
      ...structure.elements.inputs,
      ...structure.elements.links,
      ...structure.elements.forms
    ];

    const bestMatch = await this.findBestElementMatch(description, allElements);
    
    if (bestMatch) {
      return await page.$(bestMatch.selector);
    }
    
    return null;
  }

  private async findBestElementMatch(description: string, elements: any[]): Promise<any> {
    const systemPrompt = `Find the element that best matches this description: "${description}"

    Available elements: ${JSON.stringify(elements, null, 2)}

    Return the element ID and confidence:
    {"id": "button_1", "confidence": 0.9, "reasoning": "This button contains 'Add to Cart' text which matches the purchase intent"}`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      
      if (result.confidence > 0.7) {
        return elements.find(el => el.id === result.id);
      }
    } catch (error) {
      console.warn('Failed to find element match:', error);
    }
    
    return null;
  }

  async getElementSuggestions(page: Page, partialDescription: string): Promise<string[]> {
    const structure = await this.analyzeWebsite(page);
    
    const suggestions: string[] = [];
    
    structure.elements.buttons.forEach(button => {
      if (button.text.toLowerCase().includes(partialDescription.toLowerCase())) {
        suggestions.push(`Button: "${button.text}"`);
      }
    });
    
    structure.elements.inputs.forEach(input => {
      if (input.label.toLowerCase().includes(partialDescription.toLowerCase()) ||
          input.placeholder.toLowerCase().includes(partialDescription.toLowerCase())) {
        suggestions.push(`Input: "${input.label || input.placeholder}"`);
      }
    });
    
    return suggestions;
  }
}

// Helper interfaces
interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}
