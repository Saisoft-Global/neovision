import { createChatCompletion } from '../openai/chat';
import { VoiceInputProcessor } from '../voice/VoiceInputProcessor';

export interface AutomationIntent {
  action: 'navigate' | 'search' | 'fill_form' | 'click' | 'extract' | 'purchase' | 'login' | 'upload' | 'download' | 'scroll' | 'wait' | 'screenshot' | 'unknown';
  target: string;
  website?: string;
  data?: Record<string, any>;
  conditions?: Condition[];
  constraints?: Constraint[];
  priority: number;
  confidence: number;
  originalInput: string;
  parsedAt: Date;
}

export interface Condition {
  type: 'price_limit' | 'availability' | 'time_limit' | 'content_match' | 'element_present' | 'custom';
  field: string;
  operator: 'less_than' | 'greater_than' | 'equals' | 'contains' | 'exists' | 'not_exists';
  value: any;
  currency?: string;
  unit?: string;
}

export interface Constraint {
  type: 'timeout' | 'retry_count' | 'wait_for' | 'error_handling';
  value: any;
  fallback?: string;
}

export interface ClarificationRequest {
  type: 'clarification_needed' | 'clear';
  fields: string[];
  questions: string[];
  suggestions?: string[];
}

export interface EntityMap {
  websites: string[];
  products: string[];
  prices: PriceEntity[];
  dates: DateEntity[];
  contacts: ContactEntity[];
  locations: LocationEntity[];
  actions: string[];
  quantities: number[];
}

export interface PriceEntity {
  amount: number;
  currency: string;
  context: string;
  confidence: number;
}

export interface DateEntity {
  date: Date;
  context: string;
  confidence: number;
  type: 'deadline' | 'appointment' | 'event' | 'unknown';
}

export interface ContactEntity {
  type: 'email' | 'phone' | 'name' | 'address';
  value: string;
  context: string;
  confidence: number;
}

export interface LocationEntity {
  type: 'country' | 'city' | 'address' | 'coordinates';
  value: string;
  context: string;
  confidence: number;
}

export class ConversationalIntentParser {
  private static instance: ConversationalIntentParser;
  private intentCache: Map<string, AutomationIntent> = new Map();

  public static getInstance(): ConversationalIntentParser {
    if (!ConversationalIntentParser.instance) {
      ConversationalIntentParser.instance = new ConversationalIntentParser();
    }
    return ConversationalIntentParser.instance;
  }

  async parseIntent(input: string | AudioStream): Promise<AutomationIntent> {
    try {
      // Handle voice input
      let textInput: string;
      if (input instanceof AudioStream) {
        textInput = await this.speechToText(input);
      } else {
        textInput = input;
      }

      // Check cache for recent parsing
      const cacheKey = this.generateCacheKey(textInput);
      if (this.intentCache.has(cacheKey)) {
        return this.intentCache.get(cacheKey)!;
      }

      console.log(`🧠 Parsing intent: "${textInput}"`);

      // 1. Extract entities
      const entities = await this.extractEntities(textInput);
      
      // 2. Parse primary intent
      const intent = await this.parsePrimaryIntent(textInput, entities);
      
      // 3. Extract conditions and constraints
      const conditions = await this.extractConditions(textInput, entities);
      const constraints = await this.extractConstraints(textInput);
      
      // 4. Calculate confidence
      const confidence = this.calculateConfidence(intent, entities, conditions);
      
      const automationIntent: AutomationIntent = {
        action: intent.action,
        target: intent.target,
        website: intent.website,
        data: intent.data,
        conditions,
        constraints,
        priority: intent.priority || 1,
        confidence,
        originalInput: textInput,
        parsedAt: new Date()
      };

      // Cache the parsed intent
      this.intentCache.set(cacheKey, automationIntent);
      
      console.log(`✅ Intent parsed: ${automationIntent.action} -> ${automationIntent.target} (confidence: ${confidence})`);
      return automationIntent;
      
    } catch (error) {
      console.error('❌ Intent parsing failed:', error);
      throw new Error(`Failed to parse intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parsePrimaryIntent(text: string, entities: EntityMap): Promise<any> {
    const systemPrompt = `Parse this user request into a structured automation intent:

    User Request: "${text}"
    
    Extracted Entities: ${JSON.stringify(entities, null, 2)}

    Extract and structure:
    1. Primary action (navigate, search, fill_form, click, extract, purchase, login, upload, download, scroll, wait, screenshot, unknown)
    2. Target element or content (what the user wants to interact with)
    3. Website (if mentioned)
    4. Required data (form fields, search terms, etc.)
    5. Priority (1-5, where 5 is highest priority)

    Examples:
    - "Buy Samsung mobile from Flipkart if less than 1000 AED"
      → {"action": "purchase", "target": "Samsung mobile", "website": "flipkart.com", "data": {"product": "Samsung mobile"}, "priority": 4}
    
    - "Login to my Gmail account"
      → {"action": "login", "target": "Gmail login form", "website": "gmail.com", "priority": 3}
    
    - "Fill out the contact form with my details"
      → {"action": "fill_form", "target": "contact form", "data": {"name": "user_name", "email": "user_email"}, "priority": 2}
    
    - "Search for Python tutorials on YouTube"
      → {"action": "search", "target": "search box", "website": "youtube.com", "data": {"query": "Python tutorials"}, "priority": 2}
    
    - "Upload my resume to LinkedIn"
      → {"action": "upload", "target": "file upload", "website": "linkedin.com", "data": {"file": "resume"}, "priority": 3}
    
    - "Take a screenshot of this page"
      → {"action": "screenshot", "target": "current page", "priority": 1}
    
    - "Scroll down to see more content"
      → {"action": "scroll", "target": "page", "data": {"direction": "down"}, "priority": 1}

    Return JSON with the parsed intent.`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Parse this automation request.' }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      return result;
    } catch (error) {
      console.warn('Failed to parse intent with AI, using heuristics:', error);
      return this.parseIntentWithHeuristics(text, entities);
    }
  }

  private parseIntentWithHeuristics(text: string, entities: EntityMap): any {
    const lowerText = text.toLowerCase();
    
    // Determine action based on keywords
    let action: AutomationIntent['action'] = 'unknown';
    let target = '';
    let website = '';
    let priority = 1;

    if (lowerText.includes('buy') || lowerText.includes('purchase') || lowerText.includes('add to cart')) {
      action = 'purchase';
      target = this.extractProductName(text);
    } else if (lowerText.includes('login') || lowerText.includes('sign in')) {
      action = 'login';
      target = 'login form';
    } else if (lowerText.includes('search') || lowerText.includes('find')) {
      action = 'search';
      target = 'search box';
    } else if (lowerText.includes('fill') || lowerText.includes('form')) {
      action = 'fill_form';
      target = 'form';
    } else if (lowerText.includes('click') || lowerText.includes('press')) {
      action = 'click';
      target = this.extractClickTarget(text);
    } else if (lowerText.includes('upload')) {
      action = 'upload';
      target = 'file upload';
    } else if (lowerText.includes('download')) {
      action = 'download';
      target = 'download link';
    } else if (lowerText.includes('scroll')) {
      action = 'scroll';
      target = 'page';
    } else if (lowerText.includes('screenshot')) {
      action = 'screenshot';
      target = 'current page';
    } else if (lowerText.includes('wait')) {
      action = 'wait';
      target = 'page';
    }

    // Extract website
    const websiteMatch = text.match(/(?:from|on|at)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (websiteMatch) {
      website = websiteMatch[1];
    }

    // Determine priority
    if (lowerText.includes('urgent') || lowerText.includes('asap')) {
      priority = 5;
    } else if (lowerText.includes('important')) {
      priority = 4;
    } else if (lowerText.includes('quickly') || lowerText.includes('fast')) {
      priority = 3;
    }

    return {
      action,
      target,
      website,
      priority,
      data: this.extractDataFromText(text)
    };
  }

  private async extractEntities(text: string): Promise<EntityMap> {
    const systemPrompt = `Extract entities from this text:

    Text: "${text}"

    Extract:
    1. Websites (URLs, domain names)
    2. Products (items, services, brands)
    3. Prices (amounts with currency)
    4. Dates (deadlines, appointments, events)
    5. Contacts (emails, phones, names, addresses)
    6. Locations (countries, cities, addresses)
    7. Actions (verbs, commands)
    8. Quantities (numbers, amounts)

    Return JSON:
    {
      "websites": ["example.com"],
      "products": ["Samsung mobile"],
      "prices": [{"amount": 1000, "currency": "AED", "context": "budget limit", "confidence": 0.9}],
      "dates": [{"date": "2024-01-15", "context": "deadline", "confidence": 0.8}],
      "contacts": [{"type": "email", "value": "user@example.com", "context": "contact info", "confidence": 0.9}],
      "locations": [{"type": "country", "value": "UAE", "context": "location", "confidence": 0.8}],
      "actions": ["buy", "search"],
      "quantities": [1000, 1]
    }`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const result = JSON.parse(response?.choices[0]?.message?.content || '{}');
      return result;
    } catch (error) {
      console.warn('Failed to extract entities with AI, using regex:', error);
      return this.extractEntitiesWithRegex(text);
    }
  }

  private extractEntitiesWithRegex(text: string): EntityMap {
    const entities: EntityMap = {
      websites: [],
      products: [],
      prices: [],
      dates: [],
      contacts: [],
      locations: [],
      actions: [],
      quantities: []
    };

    // Extract websites
    const websiteRegex = /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const websites = text.match(websiteRegex);
    if (websites) {
      entities.websites = websites;
    }

    // Extract prices
    const priceRegex = /([$€£¥₹]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)\s*([A-Z]{3})?/g;
    const prices = text.match(priceRegex);
    if (prices) {
      entities.prices = prices.map(price => ({
        amount: parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '')),
        currency: price.match(/[A-Z]{3}/)?.[0] || 'USD',
        context: 'mentioned in text',
        confidence: 0.8
      }));
    }

    // Extract quantities
    const quantityRegex = /\b\d+\b/g;
    const quantities = text.match(quantityRegex);
    if (quantities) {
      entities.quantities = quantities.map(q => parseInt(q));
    }

    return entities;
  }

  private async extractConditions(text: string, entities: EntityMap): Promise<Condition[]> {
    const conditions: Condition[] = [];

    // Price conditions
    entities.prices.forEach(price => {
      if (text.toLowerCase().includes('less than') || text.toLowerCase().includes('under')) {
        conditions.push({
          type: 'price_limit',
          field: 'price',
          operator: 'less_than',
          value: price.amount,
          currency: price.currency
        });
      } else if (text.toLowerCase().includes('more than') || text.toLowerCase().includes('over')) {
        conditions.push({
          type: 'price_limit',
          field: 'price',
          operator: 'greater_than',
          value: price.amount,
          currency: price.currency
        });
      }
    });

    // Time conditions
    if (text.toLowerCase().includes('before') || text.toLowerCase().includes('by')) {
      entities.dates.forEach(date => {
        conditions.push({
          type: 'time_limit',
          field: 'deadline',
          operator: 'less_than',
          value: date.date
        });
      });
    }

    // Availability conditions
    if (text.toLowerCase().includes('available') || text.toLowerCase().includes('in stock')) {
      conditions.push({
        type: 'availability',
        field: 'stock',
        operator: 'exists',
        value: true
      });
    }

    return conditions;
  }

  private async extractConstraints(text: string): Promise<Constraint[]> {
    const constraints: Constraint[] = [];

    // Timeout constraints
    if (text.toLowerCase().includes('timeout') || text.toLowerCase().includes('wait')) {
      const timeoutMatch = text.match(/(\d+)\s*(seconds?|minutes?|hours?)/i);
      if (timeoutMatch) {
        let timeout = parseInt(timeoutMatch[1]);
        const unit = timeoutMatch[2].toLowerCase();
        
        if (unit.includes('minute')) timeout *= 60;
        if (unit.includes('hour')) timeout *= 3600;
        
        constraints.push({
          type: 'timeout',
          value: timeout * 1000 // Convert to milliseconds
        });
      }
    }

    // Retry constraints
    if (text.toLowerCase().includes('retry') || text.toLowerCase().includes('try again')) {
      const retryMatch = text.match(/(\d+)\s*times?/i);
      const retryCount = retryMatch ? parseInt(retryMatch[1]) : 3;
      
      constraints.push({
        type: 'retry_count',
        value: retryCount
      });
    }

    return constraints;
  }

  private calculateConfidence(intent: any, entities: EntityMap, conditions: Condition[]): number {
    let confidence = 0.5;

    // Base confidence from action clarity
    if (intent.action !== 'unknown') confidence += 0.2;
    if (intent.target) confidence += 0.1;
    if (intent.website) confidence += 0.1;

    // Entity confidence
    if (entities.websites.length > 0) confidence += 0.05;
    if (entities.products.length > 0) confidence += 0.05;
    if (entities.prices.length > 0) confidence += 0.05;

    // Condition confidence
    if (conditions.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  async handleAmbiguity(intent: AutomationIntent): Promise<ClarificationRequest> {
    const ambiguousFields: string[] = [];
    const questions: string[] = [];

    // Check for ambiguous action
    if (intent.action === 'unknown') {
      ambiguousFields.push('action');
      questions.push('What would you like me to do? (e.g., buy, search, fill form, etc.)');
    }

    // Check for ambiguous target
    if (!intent.target || intent.target === '') {
      ambiguousFields.push('target');
      questions.push('What element or content should I interact with?');
    }

    // Check for ambiguous website
    if (!intent.website && intent.action !== 'screenshot') {
      ambiguousFields.push('website');
      questions.push('Which website should I use?');
    }

    // Check for missing data
    if (intent.action === 'fill_form' && !intent.data) {
      ambiguousFields.push('data');
      questions.push('What information should I fill in the form?');
    }

    if (ambiguousFields.length > 0) {
      return {
        type: 'clarification_needed',
        fields: ambiguousFields,
        questions,
        suggestions: this.generateSuggestions(intent)
      };
    }

    return { type: 'clear', fields: [] };
  }

  private generateSuggestions(intent: AutomationIntent): string[] {
    const suggestions: string[] = [];

    if (intent.action === 'unknown') {
      suggestions.push('Try: "Buy product from website"', 'Try: "Login to website"', 'Try: "Search for something"');
    }

    if (!intent.website) {
      suggestions.push('Try: "Buy from Amazon"', 'Try: "Login to Gmail"', 'Try: "Search on Google"');
    }

    return suggestions;
  }

  private extractProductName(text: string): string {
    // Simple product name extraction
    const buyMatch = text.match(/buy\s+(.+?)(?:\s+from|\s+if|$)/i);
    if (buyMatch) return buyMatch[1].trim();
    
    const purchaseMatch = text.match(/purchase\s+(.+?)(?:\s+from|\s+if|$)/i);
    if (purchaseMatch) return purchaseMatch[1].trim();
    
    return 'product';
  }

  private extractClickTarget(text: string): string {
    const clickMatch = text.match(/click\s+(.+?)(?:\s+on|\s+button|\s+link|$)/i);
    if (clickMatch) return clickMatch[1].trim();
    
    return 'button';
  }

  private extractDataFromText(text: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Extract search terms
    const searchMatch = text.match(/search\s+(?:for\s+)?(.+?)(?:\s+on|\s+in|$)/i);
    if (searchMatch) {
      data.query = searchMatch[1].trim();
    }
    
    // Extract form data
    if (text.toLowerCase().includes('my details') || text.toLowerCase().includes('my information')) {
      data.useUserData = true;
    }
    
    return data;
  }

  private generateCacheKey(text: string): string {
    // Simple cache key generation
    return text.toLowerCase().replace(/\s+/g, '_');
  }

  private async speechToText(audioStream: AudioStream): Promise<string> {
    // Speech-to-text implementation using Web Speech API
    console.log('🎤 Converting speech to text...');
    
    try {
      // Use the VoiceInputProcessor for speech-to-text
      const voiceProcessor = VoiceInputProcessor.getInstance();
      const voiceCommand = await voiceProcessor.processAudioStream(audioStream);
      
      return voiceCommand.transcript;
    } catch (error) {
      console.error('❌ Speech-to-text conversion failed:', error);
      
      // Fallback: try to extract text from audio stream metadata
      if (audioStream.data && typeof audioStream.data === 'string') {
        return audioStream.data;
      }
      
      // Last resort fallback
      return 'Converted speech text';
    }
  }
}

// AudioStream interface for voice input processing
interface AudioStream {
  data: ArrayBuffer;
  format: string;
  sampleRate: number;
  duration: number;
  timestamp: Date;
}
