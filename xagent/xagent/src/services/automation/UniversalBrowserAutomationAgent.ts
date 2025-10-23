import { Page } from 'playwright';
import { createChatCompletion } from '../openai/chat';
import { UniversalWebsiteAnalyzer } from './UniversalWebsiteAnalyzer';
import { ConversationalIntentParser, AutomationIntent } from './ConversationalIntentParser';
import { AdaptiveElementSelector } from './AdaptiveElementSelector';
import { UniversalAutomationEngine, AutomationResult } from './UniversalAutomationEngine';
import { VoiceInputProcessor, VoiceProcessingResult } from '../voice/VoiceInputProcessor';

export interface UniversalAutomationRequest {
  input: string | AudioStream;
  page?: Page;
  website?: string;
  context?: Record<string, any>;
  options?: AutomationOptions;
}

export interface AutomationOptions {
  timeout?: number;
  retryCount?: number;
  waitForUserInput?: boolean;
  takeScreenshots?: boolean;
  verbose?: boolean;
}

export interface UniversalAutomationResponse {
  success: boolean;
  result?: AutomationResult;
  voiceResult?: VoiceProcessingResult;
  error?: string;
  suggestions?: string[];
  guidance?: string;
  executionTime: number;
}

export interface AudioStream {
  data: ArrayBuffer;
  format: string;
  sampleRate: number;
  duration: number;
  timestamp: Date;
}

export class UniversalBrowserAutomationAgent {
  private static instance: UniversalBrowserAutomationAgent;
  private websiteAnalyzer: UniversalWebsiteAnalyzer;
  private intentParser: ConversationalIntentParser;
  private elementSelector: AdaptiveElementSelector;
  private automationEngine: UniversalAutomationEngine;
  private voiceProcessor: VoiceInputProcessor;
  private activePages: Map<string, Page> = new Map();
  private isInitialized: boolean = false;

  public static getInstance(): UniversalBrowserAutomationAgent {
    if (!UniversalBrowserAutomationAgent.instance) {
      UniversalBrowserAutomationAgent.instance = new UniversalBrowserAutomationAgent();
    }
    return UniversalBrowserAutomationAgent.instance;
  }

  constructor() {
    this.websiteAnalyzer = UniversalWebsiteAnalyzer.getInstance();
    this.intentParser = ConversationalIntentParser.getInstance();
    this.elementSelector = AdaptiveElementSelector.getInstance();
    this.automationEngine = UniversalAutomationEngine.getInstance();
    this.voiceProcessor = VoiceInputProcessor.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ Universal Browser Automation Agent already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Universal Browser Automation Agent...');
      
      // Initialize voice processor
      await this.voiceProcessor.initialize();
      
      this.isInitialized = true;
      console.log('✅ Universal Browser Automation Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Universal Browser Automation Agent:', error);
      throw error;
    }
  }

  async processRequest(request: UniversalAutomationRequest): Promise<UniversalAutomationResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎯 Processing automation request: ${typeof request.input === 'string' ? request.input : 'Voice input'}`);

      // Determine if input is voice or text
      const isVoiceInput = request.input instanceof AudioStream || 
                          (typeof request.input === 'object' && 'data' in request.input);

      let result: UniversalAutomationResponse;

      if (isVoiceInput) {
        result = await this.processVoiceRequest(request);
      } else {
        result = await this.processTextRequest(request);
      }

      result.executionTime = Date.now() - startTime;
      console.log(`✅ Request processed in ${result.executionTime}ms`);
      
      return result;

    } catch (error) {
      console.error('❌ Request processing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        suggestions: this.getErrorSuggestions(),
        guidance: 'I encountered an error. Please try rephrasing your request or check if the website is accessible.',
        executionTime: Date.now() - startTime
      };
    }
  }

  private async processTextRequest(request: UniversalAutomationRequest): Promise<UniversalAutomationResponse> {
    try {
      // Parse the intent from text
      const intent = await this.intentParser.parseIntent(request.input as string);
      
      // Get or create page
      const page = await this.getOrCreatePage(request.website, request.page);
      
      // Execute automation
      const result = await this.automationEngine.executeIntent(intent, page);
      
      return {
        success: result.success,
        result,
        error: result.error,
        guidance: result.userGuidance,
        executionTime: 0 // Will be set by caller
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text processing failed',
        suggestions: this.getErrorSuggestions(),
        executionTime: 0
      };
    }
  }

  private async processVoiceRequest(request: UniversalAutomationRequest): Promise<UniversalAutomationResponse> {
    try {
      // Process voice input
      const voiceResult = await this.voiceProcessor.processVoiceCommand(request.input as AudioStream);
      
      if (!voiceResult.success) {
        return {
          success: false,
          voiceResult,
          error: voiceResult.error,
          suggestions: voiceResult.suggestions,
          executionTime: 0
        };
      }

      // Execute automation from voice command
      const page = await this.getOrCreatePage(request.website, request.page);
      const result = await this.automationEngine.executeIntent(voiceResult.intent, page);
      
      return {
        success: result.success,
        result,
        voiceResult,
        error: result.error,
        guidance: result.userGuidance,
        executionTime: 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice processing failed',
        suggestions: this.getErrorSuggestions(),
        executionTime: 0
      };
    }
  }

  private async getOrCreatePage(website?: string, existingPage?: Page): Promise<Page> {
    if (existingPage) {
      return existingPage;
    }

    if (website) {
      const pageKey = website;
      
      if (this.activePages.has(pageKey)) {
        return this.activePages.get(pageKey)!;
      }
    }

    // Create a new Playwright page
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Navigate to website if provided
      if (website) {
        const url = website.startsWith('http') ? website : `https://${website}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      }
      
      // Store page for reuse
      if (website) {
        this.activePages.set(website, page);
      }
      
      return page;
    } catch (error) {
      console.error('❌ Failed to create Playwright page:', error);
      throw new Error(`Failed to create browser page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Voice-specific methods
  async startVoiceListening(): Promise<void> {
    try {
      await this.voiceProcessor.startListening();
      console.log('🎤 Voice listening started');
    } catch (error) {
      console.error('❌ Failed to start voice listening:', error);
      throw error;
    }
  }

  async stopVoiceListening(): Promise<UniversalAutomationResponse> {
    try {
      const voiceCommand = await this.voiceProcessor.stopListening();
      
      if (!voiceCommand) {
        return {
          success: false,
          error: 'No voice command captured',
          suggestions: ['Try speaking louder', 'Check your microphone'],
          executionTime: 0
        };
      }

      // Process the voice command
      return await this.processRequest({
        input: voiceCommand.transcript,
        context: { fromVoice: true }
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice listening failed',
        suggestions: this.getErrorSuggestions(),
        executionTime: 0
      };
    }
  }

  async processVoiceCommandDirectly(audioStream: AudioStream): Promise<UniversalAutomationResponse> {
    return await this.processRequest({
      input: audioStream,
      context: { directVoiceInput: true }
    });
  }

  // Text-specific methods
  async processTextCommand(text: string, website?: string): Promise<UniversalAutomationResponse> {
    return await this.processRequest({
      input: text,
      website,
      context: { fromText: true }
    });
  }

  // Website analysis methods
  async analyzeWebsite(page: Page): Promise<any> {
    try {
      return await this.websiteAnalyzer.analyzeWebsite(page);
    } catch (error) {
      console.error('❌ Website analysis failed:', error);
      throw error;
    }
  }

  async findElement(page: Page, description: string): Promise<any> {
    try {
      return await this.elementSelector.findElement(page, description);
    } catch (error) {
      console.error('❌ Element finding failed:', error);
      throw error;
    }
  }

  async getElementSuggestions(page: Page, partialDescription: string): Promise<string[]> {
    try {
      return await this.elementSelector.getElementSuggestions(page, partialDescription);
    } catch (error) {
      console.error('❌ Element suggestions failed:', error);
      return [];
    }
  }

  // Automation execution methods
  async executeAutomation(intent: AutomationIntent, page: Page): Promise<AutomationResult> {
    try {
      return await this.automationEngine.executeIntent(intent, page);
    } catch (error) {
      console.error('❌ Automation execution failed:', error);
      throw error;
    }
  }

  async executeFromNaturalLanguage(input: string, page: Page): Promise<AutomationResult> {
    try {
      return await this.automationEngine.executeFromNaturalLanguage(input, page);
    } catch (error) {
      console.error('❌ Natural language automation failed:', error);
      throw error;
    }
  }

  // Utility methods
  async getAutomationSuggestions(page: Page): Promise<string[]> {
    try {
      return await this.automationEngine.getAutomationSuggestions(page);
    } catch (error) {
      console.error('❌ Automation suggestions failed:', error);
      return [];
    }
  }

  async testVoiceInput(): Promise<boolean> {
    try {
      return await this.voiceProcessor.testMicrophone();
    } catch (error) {
      console.error('❌ Voice input test failed:', error);
      return false;
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      return await this.voiceProcessor.getSupportedLanguages();
    } catch (error) {
      console.error('❌ Language support check failed:', error);
      return ['en-US'];
    }
  }

  // Configuration methods
  setVoiceLanguage(language: string): void {
    this.voiceProcessor.setLanguage(language);
  }

  setVoiceService(service: 'web_speech' | 'google_cloud' | 'azure' | 'aws', apiKey?: string, region?: string): void {
    this.voiceProcessor.setService(service, apiKey, region);
  }

  // Status methods
  isVoiceListening(): boolean {
    return this.voiceProcessor.isCurrentlyListening();
  }

  isProcessing(): boolean {
    return this.voiceProcessor.isCurrentlyProcessing();
  }

  // Error handling
  private getErrorSuggestions(): string[] {
    return [
      'Try rephrasing your request',
      'Be more specific about what you want to do',
      'Check if the website is accessible',
      'Make sure your microphone is working (for voice commands)',
      'Try a simpler command first',
      'Check your internet connection'
    ];
  }

  // Advanced features
  async createAutomationWorkflow(description: string): Promise<any> {
    try {
      const systemPrompt = `Create a detailed automation workflow from this description:

      Description: "${description}"

      Return a JSON workflow that can be executed by the automation engine:
      {
        "name": "Workflow Name",
        "description": "Detailed description",
        "steps": [
          {
            "id": "step_1",
            "action": "navigate",
            "target": "https://example.com",
            "description": "Navigate to website"
          }
        ],
        "estimatedDuration": 60000,
        "confidence": 0.9
      }`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      return JSON.parse(response?.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('❌ Workflow creation failed:', error);
      throw error;
    }
  }

  async optimizeAutomationWorkflow(workflow: any, executionResults: any[]): Promise<any> {
    try {
      const systemPrompt = `Optimize this automation workflow based on execution results:

      Original Workflow: ${JSON.stringify(workflow, null, 2)}
      Execution Results: ${JSON.stringify(executionResults, null, 2)}

      Return an optimized workflow:
      {
        "optimizations": ["list of improvements"],
        "optimizedWorkflow": { /* optimized workflow */ },
        "confidence": 0.9,
        "expectedImprovement": "description of improvements"
      }`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      return JSON.parse(response?.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('❌ Workflow optimization failed:', error);
      throw error;
    }
  }

  // Cleanup
  destroy(): void {
    this.voiceProcessor.destroy();
    this.activePages.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const universalBrowserAutomationAgent = UniversalBrowserAutomationAgent.getInstance();
