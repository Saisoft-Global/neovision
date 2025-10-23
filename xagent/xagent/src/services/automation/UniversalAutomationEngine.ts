import { Page } from 'playwright';
import { createChatCompletion } from '../openai/chat';
import { UniversalWebsiteAnalyzer, WebsiteStructure } from './UniversalWebsiteAnalyzer';
import { ConversationalIntentParser, AutomationIntent } from './ConversationalIntentParser';
import { AdaptiveElementSelector, ElementSearchResult } from './AdaptiveElementSelector';
import { automationService } from './AutomationService';

export interface AutomationResult {
  success: boolean;
  results: ExecutionResult[];
  website: WebsiteStructure;
  plan: AutomationPlan;
  executionTime: number;
  error?: string;
  userGuidance?: string;
}

export interface ExecutionResult {
  step: PlanStep;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  userInput?: any;
  screenshots?: string[];
}

export interface AutomationPlan {
  steps: PlanStep[];
  estimatedDuration: number;
  confidence: number;
  fallbacks: FallbackStrategy[];
}

export interface PlanStep {
  id: string;
  description: string;
  action: string;
  target: string;
  data?: any;
  conditions?: any[];
  requiresUserInput?: boolean;
  waitForChanges?: WaitCondition;
  timeout?: number;
  retryCount?: number;
  priority: number;
}

export interface FallbackStrategy {
  condition: string;
  action: string;
  description: string;
}

export interface WaitCondition {
  type: 'element' | 'text' | 'url' | 'network' | 'time';
  value: any;
  timeout: number;
}

export interface ExecutionContext {
  page: Page;
  website: WebsiteStructure;
  intent: AutomationIntent;
  results: ExecutionResult[];
  userInputs: Map<string, any>;
  variables: Map<string, any>;
}

export class UniversalAutomationEngine {
  private static instance: UniversalAutomationEngine;
  private websiteAnalyzer: UniversalWebsiteAnalyzer;
  private intentParser: ConversationalIntentParser;
  private elementSelector: AdaptiveElementSelector;
  private executionCache: Map<string, AutomationResult> = new Map();

  public static getInstance(): UniversalAutomationEngine {
    if (!UniversalAutomationEngine.instance) {
      UniversalAutomationEngine.instance = new UniversalAutomationEngine();
    }
    return UniversalAutomationEngine.instance;
  }

  constructor() {
    this.websiteAnalyzer = UniversalWebsiteAnalyzer.getInstance();
    this.intentParser = ConversationalIntentParser.getInstance();
    this.elementSelector = AdaptiveElementSelector.getInstance();
  }

  async executeIntent(intent: AutomationIntent, page: Page): Promise<AutomationResult> {
    const startTime = Date.now();
    const cacheKey = `${page.url()}_${intent.originalInput}`;
    
    // Check cache for recent execution
    if (this.executionCache.has(cacheKey)) {
      const cached = this.executionCache.get(cacheKey)!;
      if (Date.now() - cached.executionTime < 300000) { // 5 minutes
        return cached;
      }
    }

    try {
      console.log(`🚀 Executing automation intent: ${intent.action} -> ${intent.target}`);
      
      // 1. Analyze website structure
      const website = await this.websiteAnalyzer.analyzeWebsite(page);
      
      // 2. Generate execution plan
      const plan = await this.generateExecutionPlan(intent, website);
      
      // 3. Execute plan with error handling
      const results = await this.executePlan(plan, page, intent, website);
      
      // 4. Validate results
      const validation = await this.validateResults(results, intent);
      
      const automationResult: AutomationResult = {
        success: validation.isValid,
        results,
        website,
        plan,
        executionTime: Date.now() - startTime,
        error: validation.error,
        userGuidance: validation.userGuidance
      };

      // Cache the result
      this.executionCache.set(cacheKey, automationResult);
      
      console.log(`✅ Automation completed: ${automationResult.success ? 'SUCCESS' : 'FAILED'} (${automationResult.executionTime}ms)`);
      return automationResult;
      
    } catch (error) {
      console.error('❌ Automation execution failed:', error);
      return await this.handleExecutionError(error, intent, page);
    }
  }

  private async generateExecutionPlan(intent: AutomationIntent, website: WebsiteStructure): Promise<AutomationPlan> {
    console.log(`📋 Generating execution plan for: ${intent.action}`);
    
    const systemPrompt = `Generate a detailed automation plan for this intent:

    Intent: ${JSON.stringify(intent, null, 2)}
    Website: ${JSON.stringify(website, null, 2)}

    Create a step-by-step plan that will accomplish the user's goal.
    Each step should be specific, actionable, and include error handling.

    Return JSON:
    {
      "steps": [
        {
          "id": "step_1",
          "description": "Navigate to the target website",
          "action": "navigate",
          "target": "website URL",
          "priority": 1,
          "timeout": 30000,
          "retryCount": 3
        },
        {
          "id": "step_2", 
          "description": "Find and click the search button",
          "action": "click",
          "target": "search button",
          "priority": 2,
          "requiresUserInput": false,
          "waitForChanges": {"type": "element", "value": "search results", "timeout": 10000}
        }
      ],
      "estimatedDuration": 120000,
      "confidence": 0.9,
      "fallbacks": [
        {
          "condition": "element not found",
          "action": "try alternative selector",
          "description": "Use alternative selector strategy"
        }
      ]
    }`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      const planData = JSON.parse(response?.choices[0]?.message?.content || '{}');
      
      return {
        steps: planData.steps || [],
        estimatedDuration: planData.estimatedDuration || 60000,
        confidence: planData.confidence || 0.8,
        fallbacks: planData.fallbacks || []
      };
    } catch (error) {
      console.warn('Failed to generate plan with AI, using default:', error);
      return this.generateDefaultPlan(intent);
    }
  }

  private generateDefaultPlan(intent: AutomationIntent): AutomationPlan {
    const steps: PlanStep[] = [];
    
    switch (intent.action) {
      case 'navigate':
        steps.push({
          id: 'navigate_step',
          description: `Navigate to ${intent.website || 'target website'}`,
          action: 'navigate',
          target: intent.website || intent.target,
          priority: 1,
          timeout: 30000
        });
        break;
        
      case 'search':
        steps.push(
          {
            id: 'find_search_box',
            description: 'Find search input field',
            action: 'find_element',
            target: 'search box',
            priority: 1
          },
          {
            id: 'enter_search_term',
            description: `Enter search term: ${intent.data?.query || intent.target}`,
            action: 'fill_form',
            target: 'search input',
            data: { value: intent.data?.query || intent.target },
            priority: 2
          },
          {
            id: 'submit_search',
            description: 'Submit search',
            action: 'click',
            target: 'search button',
            priority: 3
          }
        );
        break;
        
      case 'purchase':
        steps.push(
          {
            id: 'find_product',
            description: `Find product: ${intent.target}`,
            action: 'find_element',
            target: intent.target,
            priority: 1
          },
          {
            id: 'check_price',
            description: 'Check product price',
            action: 'extract',
            target: 'price element',
            priority: 2
          },
          {
            id: 'add_to_cart',
            description: 'Add product to cart',
            action: 'click',
            target: 'add to cart button',
            priority: 3
          },
          {
            id: 'proceed_checkout',
            description: 'Proceed to checkout',
            action: 'click',
            target: 'checkout button',
            priority: 4
          }
        );
        break;
        
      case 'login':
        steps.push(
          {
            id: 'find_username_field',
            description: 'Find username/email field',
            action: 'find_element',
            target: 'username input',
            priority: 1
          },
          {
            id: 'enter_username',
            description: 'Enter username/email',
            action: 'fill_form',
            target: 'username input',
            requiresUserInput: true,
            priority: 2
          },
          {
            id: 'find_password_field',
            description: 'Find password field',
            action: 'find_element',
            target: 'password input',
            priority: 3
          },
          {
            id: 'enter_password',
            description: 'Enter password',
            action: 'fill_form',
            target: 'password input',
            requiresUserInput: true,
            priority: 4
          },
          {
            id: 'submit_login',
            description: 'Submit login form',
            action: 'click',
            target: 'login button',
            priority: 5
          }
        );
        break;
        
      case 'fill_form':
        steps.push(
          {
            id: 'find_form',
            description: `Find form: ${intent.target}`,
            action: 'find_element',
            target: intent.target,
            priority: 1
          },
          {
            id: 'fill_form_fields',
            description: 'Fill form fields',
            action: 'fill_form',
            target: 'form inputs',
            data: intent.data,
            priority: 2
          },
          {
            id: 'submit_form',
            description: 'Submit form',
            action: 'click',
            target: 'submit button',
            priority: 3
          }
        );
        break;
    }
    
    return {
      steps,
      estimatedDuration: steps.length * 15000, // 15 seconds per step
      confidence: 0.7,
      fallbacks: []
    };
  }

  private async executePlan(
    plan: AutomationPlan, 
    page: Page, 
    intent: AutomationIntent, 
    website: WebsiteStructure
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const context: ExecutionContext = {
      page,
      website,
      intent,
      results,
      userInputs: new Map(),
      variables: new Map()
    };
    
    console.log(`🎬 Executing ${plan.steps.length} steps`);
    
    for (const step of plan.steps) {
      try {
        console.log(`⚡ Executing step: ${step.description}`);
        const stepStartTime = Date.now();
        
        const result = await this.executeStep(step, context);
        
        results.push({
          step,
          success: result.success,
          result: result.data,
          error: result.error,
          duration: Date.now() - stepStartTime,
          userInput: result.userInput,
          screenshots: result.screenshots
        });
        
        // Check if we need to pause for user input
        if (step.requiresUserInput && !result.userInput) {
          const userInput = await this.pauseForUserInput(step, context);
          result.userInput = userInput;
          context.userInputs.set(step.id, userInput);
        }
        
        // Wait for page changes if needed
        if (step.waitForChanges && result.success) {
          await this.waitForPageChanges(page, step.waitForChanges);
        }
        
        // Check conditions
        if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
          console.log(`⚠️ Conditions not met for step: ${step.id}`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Step execution failed: ${step.id}`, error);
        
        // Try fallback strategy
        const fallbackResult = await this.tryFallbackStrategy(step, context, error);
        
        results.push({
          step,
          success: fallbackResult.success,
          result: fallbackResult.data,
          error: fallbackResult.error || (error instanceof Error ? error.message : 'Unknown error'),
          duration: Date.now() - Date.now(),
          screenshots: fallbackResult.screenshots
        });
        
        if (!fallbackResult.success) {
          break; // Stop execution if fallback also fails
        }
      }
    }
    
    return results;
  }

  private async executeStep(step: PlanStep, context: ExecutionContext): Promise<any> {
    const { page, website, intent } = context;
    
    switch (step.action) {
      case 'navigate':
        return await this.executeNavigate(step, page);
        
      case 'find_element':
        return await this.executeFindElement(step, page);
        
      case 'click':
        return await this.executeClick(step, page);
        
      case 'fill_form':
        return await this.executeFillForm(step, page, context);
        
      case 'extract':
        return await this.executeExtract(step, page);
        
      case 'screenshot':
        return await this.executeScreenshot(step, page);
        
      case 'wait':
        return await this.executeWait(step, page);
        
      case 'scroll':
        return await this.executeScroll(step, page);
        
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private async executeNavigate(step: PlanStep, page: Page): Promise<any> {
    const url = step.target.startsWith('http') ? step.target : `https://${step.target}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    
    return {
      success: true,
      data: { url: page.url(), title: await page.title() }
    };
  }

  private async executeFindElement(step: PlanStep, page: Page): Promise<any> {
    const elementResult = await this.elementSelector.findElement(page, step.target);
    
    if (elementResult.element) {
      return {
        success: true,
        data: {
          element: elementResult.element,
          selector: elementResult.selector,
          confidence: elementResult.confidence
        }
      };
    }
    
    throw new Error(`Element not found: ${step.target}`);
  }

  private async executeClick(step: PlanStep, page: Page): Promise<any> {
    const elementResult = await this.elementSelector.findElement(page, step.target);
    
    if (elementResult.element) {
      await elementResult.element.click();
      await page.waitForLoadState('networkidle');
      
      return {
        success: true,
        data: {
          clickedElement: step.target,
          newUrl: page.url()
        }
      };
    }
    
    throw new Error(`Click target not found: ${step.target}`);
  }

  private async executeFillForm(step: PlanStep, page: Page, context: ExecutionContext): Promise<any> {
    const elementResult = await this.elementSelector.findElement(page, step.target);
    
    if (elementResult.element) {
      let value = step.data?.value;
      
      // Use user input if available
      if (step.requiresUserInput && context.userInputs.has(step.id)) {
        value = context.userInputs.get(step.id);
      }
      
      if (value) {
        await elementResult.element.fill(value);
        
        return {
          success: true,
          data: {
            filledField: step.target,
            value: value
          }
        };
      } else {
        return {
          success: false,
          error: 'No value provided for form field'
        };
      }
    }
    
    throw new Error(`Form field not found: ${step.target}`);
  }

  private async executeExtract(step: PlanStep, page: Page): Promise<any> {
    const elementResult = await this.elementSelector.findElement(page, step.target);
    
    if (elementResult.element) {
      const text = await elementResult.element.textContent();
      const value = await elementResult.element.inputValue?.() || text;
      
      return {
        success: true,
        data: {
          extractedText: text,
          extractedValue: value,
          element: step.target
        }
      };
    }
    
    throw new Error(`Extraction target not found: ${step.target}`);
  }

  private async executeScreenshot(step: PlanStep, page: Page): Promise<any> {
    const screenshot = await page.screenshot();
    
    return {
      success: true,
      data: {
        screenshot: screenshot.toString('base64'),
        url: page.url()
      },
      screenshots: [screenshot.toString('base64')]
    };
  }

  private async executeWait(step: PlanStep, page: Page): Promise<any> {
    const duration = step.data?.duration || 1000;
    await page.waitForTimeout(duration);
    
    return {
      success: true,
      data: { waited: duration }
    };
  }

  private async executeScroll(step: PlanStep, page: Page): Promise<any> {
    const direction = step.data?.direction || 'down';
    const amount = step.data?.amount || 500;
    
    if (direction === 'down') {
      await page.evaluate((amount) => window.scrollBy(0, amount), amount);
    } else if (direction === 'up') {
      await page.evaluate((amount) => window.scrollBy(0, -amount), amount);
    }
    
    return {
      success: true,
      data: { scrolled: direction, amount }
    };
  }

  private async pauseForUserInput(step: PlanStep, context: ExecutionContext): Promise<any> {
    // Integrate with the chat system to request user input
    console.log(`⏸️ Pausing for user input: ${step.description}`);
    
    try {
      // Dispatch a custom event to request user input
      const inputRequest = new CustomEvent('automationInputRequest', {
        detail: {
          stepId: step.id,
          description: step.description,
          requiredData: step.data,
          timestamp: new Date()
        }
      });
      
      window.dispatchEvent(inputRequest);
      
      // Wait for user input with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            userInput: 'timeout_default_input',
            timestamp: new Date()
          });
        }, 30000); // 30 second timeout
        
        const handleUserInput = (event: any) => {
          if (event.detail.stepId === step.id) {
            clearTimeout(timeout);
            window.removeEventListener('automationInputResponse', handleUserInput);
            resolve({
              userInput: event.detail.userInput,
              timestamp: new Date()
            });
          }
        };
        
        window.addEventListener('automationInputResponse', handleUserInput);
      });
    } catch (error) {
      console.error('Failed to request user input:', error);
      return {
        userInput: 'error_default_input',
        timestamp: new Date()
      };
    }
  }

  private async waitForPageChanges(page: Page, waitCondition: WaitCondition): Promise<void> {
    switch (waitCondition.type) {
      case 'element':
        await page.waitForSelector(waitCondition.value, { timeout: waitCondition.timeout });
        break;
      case 'text':
        await page.waitForFunction(
          (text) => document.body.textContent?.includes(text),
          waitCondition.value,
          { timeout: waitCondition.timeout }
        );
        break;
      case 'url':
        await page.waitForURL(waitCondition.value, { timeout: waitCondition.timeout });
        break;
      case 'network':
        await page.waitForLoadState('networkidle', { timeout: waitCondition.timeout });
        break;
      case 'time':
        await page.waitForTimeout(waitCondition.value);
        break;
    }
  }

  private evaluateConditions(conditions: any[], context: ExecutionContext): boolean {
    // Simplified condition evaluation
    return true; // For now, always return true
  }

  private async tryFallbackStrategy(step: PlanStep, context: ExecutionContext, error: any): Promise<any> {
    console.log(`🔄 Trying fallback strategy for step: ${step.id}`);
    
    // Try alternative selectors
    try {
      const alternatives = await this.elementSelector.getElementSuggestions(context.page, step.target);
      
      if (alternatives.length > 0) {
        const alternativeTarget = alternatives[0].split(': ')[1].replace(/"/g, '');
        const elementResult = await this.elementSelector.findElement(context.page, alternativeTarget);
        
        if (elementResult.element) {
          return await this.executeStep({ ...step, target: alternativeTarget }, context);
        }
      }
    } catch (fallbackError) {
      console.warn('Fallback strategy failed:', fallbackError);
    }
    
    return {
      success: false,
      error: `Fallback strategy failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  private async validateResults(results: ExecutionResult[], intent: AutomationIntent): Promise<any> {
    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;
    const successRate = successCount / totalSteps;
    
    if (successRate >= 0.8) {
      return {
        isValid: true,
        confidence: successRate,
        userGuidance: 'Automation completed successfully'
      };
    } else if (successRate >= 0.5) {
      return {
        isValid: false,
        confidence: successRate,
        error: 'Partial automation completed',
        userGuidance: 'Some steps failed. Would you like me to retry or help with the remaining tasks?'
      };
    } else {
      return {
        isValid: false,
        confidence: successRate,
        error: 'Automation failed',
        userGuidance: 'The automation encountered errors. Please check the website and try again, or provide more specific instructions.'
      };
    }
  }

  private async handleExecutionError(error: any, intent: AutomationIntent, page: Page): Promise<AutomationResult> {
    console.error('❌ Execution error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      results: [],
      website: await this.websiteAnalyzer.analyzeWebsite(page),
      plan: { steps: [], estimatedDuration: 0, confidence: 0, fallbacks: [] },
      executionTime: 0,
      error: errorMessage,
      userGuidance: `I encountered an error: ${errorMessage}. Would you like me to try a different approach or help you with something else?`
    };
  }

  // Public methods for integration
  async executeFromNaturalLanguage(input: string, page: Page): Promise<AutomationResult> {
    const intent = await this.intentParser.parseIntent(input);
    return await this.executeIntent(intent, page);
  }

  async executeFromVoice(audioStream: any, page: Page): Promise<AutomationResult> {
    const intent = await this.intentParser.parseIntent(audioStream);
    return await this.executeIntent(intent, page);
  }

  async getAutomationSuggestions(page: Page): Promise<string[]> {
    const website = await this.websiteAnalyzer.analyzeWebsite(page);
    const suggestions: string[] = [];
    
    // Generate suggestions based on website type
    switch (website.pageType) {
      case 'ecommerce':
        suggestions.push('Buy a product', 'Search for items', 'Add to cart', 'Check price');
        break;
      case 'login':
        suggestions.push('Login to account', 'Enter credentials');
        break;
      case 'form':
        suggestions.push('Fill out form', 'Submit information');
        break;
      case 'search':
        suggestions.push('Search for content', 'Filter results');
        break;
      default:
        suggestions.push('Click button', 'Fill form', 'Extract text', 'Take screenshot');
    }
    
    return suggestions;
  }
}
