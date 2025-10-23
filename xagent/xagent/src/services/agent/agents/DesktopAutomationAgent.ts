import type { AgentConfig } from '../../../types/agent-framework';
import type { AgentResponse } from '../types';
import { BaseAgent } from '../BaseAgent';
import { createChatCompletion } from '../../openai/chat';
import { universalBrowserAutomationAgent } from '../../automation/UniversalBrowserAutomationAgent';
import { automationService } from '../../automation/AutomationService';
import { SharedContext } from '../../context/SharedContext';

interface ExecutionRecord {
  timestamp: Date;
  action: string;
  parameters: Record<string, any>;
  success: boolean;
  duration: number;
  error?: string;
  adaptation?: string;
}

interface AutomationStrategy {
  id: string;
  name: string;
  condition: (context: any) => boolean;
  action: (step: any) => Promise<any>;
  successRate: number;
  usageCount: number;
}

export class DesktopAutomationAgent extends BaseAgent {
  private sharedContext: SharedContext;
  private executionHistory: ExecutionRecord[];
  private adaptiveStrategies: AutomationStrategy[];

  constructor(id: string, config: AgentConfig) {
    super(id, config);
    this.sharedContext = SharedContext.getInstance();
    this.executionHistory = [];
    this.adaptiveStrategies = this.initializeAdaptiveStrategies();
  }

  private initializeAdaptiveStrategies(): AutomationStrategy[] {
    return [
      {
        id: 'wait_and_retry',
        name: 'Wait and Retry Strategy',
        condition: (context) => context.error?.includes('timeout') || context.error?.includes('not found'),
        action: async (step) => {
          console.log('🔄 Applying wait and retry strategy');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await this.executeAgentAction(step);
        },
        successRate: 0.8,
        usageCount: 0
      },
      {
        id: 'alternative_selector',
        name: 'Alternative Selector Strategy',
        condition: (context) => context.error?.includes('selector') || context.error?.includes('element'),
        action: async (step) => {
          console.log('🎯 Applying alternative selector strategy');
          step.parameters.useAlternativeSelector = true;
          return await this.executeAgentAction(step);
        },
        successRate: 0.7,
        usageCount: 0
      },
      {
        id: 'context_aware_automation',
        name: 'Context-Aware Automation Strategy',
        condition: (context) => context.hasUserContext && context.userPreferences,
        action: async (step) => {
          console.log('🧠 Applying context-aware automation strategy');
          const userContext = await this.sharedContext.get('user_preferences');
          step.parameters.userContext = userContext;
          return await this.executeAgentAction(step);
        },
        successRate: 0.9,
        usageCount: 0
      }
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'understand_and_execute':
          return await this.understandAndExecute(params.query as string);
        case 'execute_desktop_task':
          return await this.executeDesktopTask(params);
        case 'execute_browser_task':
          return await this.executeBrowserTask(params);
        case 'plan_automation':
          return await this.planAutomation(params.query as string);
        case 'universal_automation':
          return await this.executeUniversalAutomation(params);
        case 'voice_automation':
          return await this.executeVoiceAutomation(params);
        case 'analyze_website':
          return await this.analyzeWebsite(params);
        case 'find_element':
          return await this.findElement(params);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async understandAndExecute(query: string): Promise<AgentResponse> {
    try {
      console.log('🤖 Starting adaptive automation execution...');
      
      // Enhanced goal-oriented intent understanding
      const intent = await this.understandIntentWithContext(query);
      
      if (!intent.success) {
        return {
          success: false,
          data: null,
          error: intent.error
        };
      }

      // Create adaptive execution plan
      const plan = await this.createAdaptivePlan(query, intent.data);
      
      if (!plan.success) {
        return {
          success: false,
          data: null,
          error: plan.error
        };
      }

      // Execute with adaptive strategies
      const results = [];
      for (const step of plan.data.steps) {
        const result = await this.executeAdaptiveStep(step, results);
        results.push(result);
        
        // Record execution for learning
        this.recordExecution(step, result);
        
        // If a step fails, try recovery strategies
        if (!result.success) {
          const recoveryResult = await this.attemptRecovery(step, result.error);
          if (recoveryResult.success) {
            results[results.length - 1] = recoveryResult; // Replace failed result
            continue;
          } else {
            return {
              success: false,
              data: { 
                completed_steps: results.length, 
                total_steps: plan.data.steps.length,
                adaptive_attempts: this.getAdaptiveAttempts(),
                learning_insights: this.getLearningInsights()
              },
              error: `Step ${results.length} failed after recovery attempts: ${result.error}`
            };
          }
        }
      }

      // Perform learning reflection
      await this.performLearningReflection(query, results);

      return {
        success: true,
        data: {
          query,
          intent: intent.data,
          plan: plan.data,
          results,
          adaptive_strategies_used: this.getUsedStrategies(),
          learning_insights: this.getLearningInsights(),
          summary: `Successfully completed ${results.length} automation steps with adaptive intelligence`
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to understand and execute automation'
      };
    }
  }

  private async understandIntent(query: string): Promise<AgentResponse> {
    try {
      const systemPrompt = `You are an AI automation specialist. Analyze the user's request and determine:

1. What type of automation is needed (desktop, browser, or both)
2. What specific actions need to be performed
3. What applications or websites are involved
4. What data needs to be entered or extracted

Return your analysis in this JSON format:
{
  "type": "desktop|browser|mixed",
  "actions": ["action1", "action2", ...],
  "applications": ["app1", "app2", ...],
  "data_required": {...},
  "complexity": "simple|moderate|complex",
  "estimated_steps": number
}

Examples:
- "Open Excel and create a report" → {"type": "desktop", "actions": ["open_app", "create_file"], "applications": ["excel"], "complexity": "simple", "estimated_steps": 3}
- "Login to my banking website" → {"type": "browser", "actions": ["navigate", "fill_form", "click"], "applications": ["banking_website"], "complexity": "simple", "estimated_steps": 4}
- "Open Word, type a document, save it, then email it" → {"type": "mixed", "actions": ["open_app", "type", "save", "email"], "applications": ["word", "email_client"], "complexity": "moderate", "estimated_steps": 6}`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      const intentText = response?.choices[0]?.message?.content || '';
      
      try {
        const intent = JSON.parse(intentText);
        return {
          success: true,
          data: intent
        };
      } catch (parseError) {
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response into intent format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to understand user intent'
      };
    }
  }

  private async planAutomation(query: string): Promise<AgentResponse> {
    try {
      const systemPrompt = `You are an automation planner. Given a user request, create a detailed step-by-step automation plan.

Return your plan in this JSON format:
{
  "steps": [
    {
      "step_number": 1,
      "type": "desktop|browser",
      "action": "specific_action",
      "parameters": {...},
      "description": "human_readable_description",
      "wait_time": 2000
    }
  ]
}

Available desktop actions: move_mouse, click, type, key_press, open_app
Available browser actions: navigate, click_element, fill_form, extract_text, screenshot

Examples:
- "Open Excel" → [{"step_number": 1, "type": "desktop", "action": "open_app", "parameters": {"app": "excel"}, "description": "Open Microsoft Excel", "wait_time": 3000}]
- "Login to website" → [{"step_number": 1, "type": "browser", "action": "navigate", "parameters": {"url": "website_url"}, "description": "Navigate to website", "wait_time": 2000}, {"step_number": 2, "type": "browser", "action": "fill_form", "parameters": {"selector": "#username", "value": "username"}, "description": "Enter username", "wait_time": 1000}]`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      const planText = response?.choices[0]?.message?.content || '';
      
      try {
        const plan = JSON.parse(planText);
        return {
          success: true,
          data: plan
        };
      } catch (parseError) {
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response into plan format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create automation plan'
      };
    }
  }

  private async executeStep(step: any): Promise<AgentResponse> {
    try {
      const { type, action, parameters, wait_time } = step;
      
      let result;
      if (type === 'desktop') {
        result = await this.executeDesktopTask({ action, ...parameters });
      } else if (type === 'browser') {
        result = await this.executeBrowserTask({ action, ...parameters });
      } else {
        throw new Error(`Unknown automation type: ${type}`);
      }

      // Wait if specified
      if (wait_time && wait_time > 0) {
        await new Promise(resolve => setTimeout(resolve, wait_time));
      }

      return result;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to execute automation step'
      };
    }
  }

  private async executeDesktopTask(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const { action, ...taskParams } = params;
      
      // Map action names to automation service calls
      let result;
      switch (action) {
        case 'move_mouse':
          result = await automationService.moveMouse(taskParams.x as number, taskParams.y as number);
          break;
        case 'click':
          result = await automationService.clickMouse(taskParams.x as number, taskParams.y as number, taskParams.button as string);
          break;
        case 'type':
          result = await automationService.typeText(taskParams.text as string);
          break;
        case 'key_press':
          result = await automationService.pressKey(taskParams.key as string);
          break;
        case 'open_app':
          // For opening apps, we might need to use key combinations like Win+R
          result = await automationService.pressKey('cmd+space'); // Mac
          await new Promise(resolve => setTimeout(resolve, 1000));
          result = await automationService.typeText(taskParams.app as string);
          await new Promise(resolve => setTimeout(resolve, 1000));
          result = await automationService.pressKey('enter');
          break;
        default:
          throw new Error(`Unknown desktop action: ${action}`);
      }

      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to execute desktop task'
      };
    }
  }

  private async executeBrowserTask(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const { action, ...taskParams } = params;
      
      // Map action names to automation service calls
      let result;
      switch (action) {
        case 'navigate':
          result = await automationService.navigateToURL(taskParams.url as string);
          break;
        case 'click_element':
          result = await automationService.clickElement(taskParams.selector as string);
          break;
        case 'fill_form':
          result = await automationService.fillForm(taskParams.selector as string, taskParams.value as string);
          break;
        case 'extract_text':
          result = await automationService.extractText(taskParams.selector as string);
          break;
        case 'screenshot':
          result = await automationService.takeScreenshot();
          break;
        default:
          throw new Error(`Unknown browser action: ${action}`);
      }

      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to execute browser task'
      };
    }
  }

  // Universal Automation Methods
  private async executeUniversalAutomation(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const input = params.input as string;
      const website = params.website as string;
      
      console.log(`🌐 Executing universal automation: "${input}"`);
      
      const result = await universalBrowserAutomationAgent.processTextCommand(input, website);
      
      return {
        success: result.success,
        data: {
          result: result.result,
          guidance: result.guidance,
          suggestions: result.suggestions,
          executionTime: result.executionTime
        },
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Universal automation failed'
      };
    }
  }

  private async executeVoiceAutomation(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const audioStream = params.audioStream as any;
      
      console.log(`🎤 Executing voice automation`);
      
      const result = await universalBrowserAutomationAgent.processVoiceCommandDirectly(audioStream);
      
      return {
        success: result.success,
        data: {
          result: result.result,
          voiceResult: result.voiceResult,
          guidance: result.guidance,
          suggestions: result.suggestions,
          executionTime: result.executionTime
        },
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Voice automation failed'
      };
    }
  }

  private async analyzeWebsite(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const page = params.page as any; // Page object from Playwright
      
      if (!page) {
        throw new Error('Page object is required for website analysis');
      }
      
      console.log(`🔍 Analyzing website: ${page.url()}`);
      
      const analysis = await universalBrowserAutomationAgent.analyzeWebsite(page);
      
      return {
        success: true,
        data: {
          analysis,
          suggestions: await universalBrowserAutomationAgent.getAutomationSuggestions(page)
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Website analysis failed'
      };
    }
  }

  private async findElement(params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      const page = params.page as any;
      const description = params.description as string;
      
      if (!page || !description) {
        throw new Error('Page object and element description are required');
      }
      
      console.log(`🎯 Finding element: "${description}"`);
      
      const elementResult = await universalBrowserAutomationAgent.findElement(page, description);
      
      return {
        success: true,
        data: {
          element: elementResult.element,
          selector: elementResult.selector,
          confidence: elementResult.confidence,
          context: elementResult.context
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Element finding failed'
      };
    }
  }

  // Voice control methods
  async startVoiceListening(): Promise<AgentResponse> {
    try {
      await universalBrowserAutomationAgent.startVoiceListening();
      
      return {
        success: true,
        data: {
          message: 'Voice listening started. Speak your automation request.',
          isListening: true
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to start voice listening'
      };
    }
  }

  async stopVoiceListening(): Promise<AgentResponse> {
    try {
      const result = await universalBrowserAutomationAgent.stopVoiceListening();
      
      return {
        success: result.success,
        data: {
          result: result.result,
          voiceCommand: result.voiceResult?.command,
          guidance: result.guidance,
          executionTime: result.executionTime
        },
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to stop voice listening'
      };
    }
  }

  // Utility methods
  async testVoiceInput(): Promise<AgentResponse> {
    try {
      const isWorking = await universalBrowserAutomationAgent.testVoiceInput();
      
      return {
        success: isWorking,
        data: {
          microphoneWorking: isWorking,
          message: isWorking ? 'Microphone is working correctly' : 'Microphone test failed'
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Voice input test failed'
      };
    }
  }

  async getSupportedLanguages(): Promise<AgentResponse> {
    try {
      const languages = await universalBrowserAutomationAgent.getSupportedLanguages();
      
      return {
        success: true,
        data: {
          languages,
          currentLanguage: 'en-US' // Default
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get supported languages'
      };
    }
  }

  // ============ ENHANCED AGENTIC CAPABILITIES ============

  /**
   * Enhanced intent understanding with context awareness
   */
  private async understandIntentWithContext(query: string): Promise<AgentResponse> {
    try {
      // Get user context and preferences
      const userContext = await this.sharedContext.get('user_preferences');
      const executionHistory = this.executionHistory.slice(-5); // Last 5 executions
      
      const systemPrompt = `You are an advanced AI automation specialist with context awareness. Analyze the user's request considering their history and preferences.

User Context: ${JSON.stringify(userContext)}
Recent Executions: ${JSON.stringify(executionHistory)}

Analyze the request and determine:
1. What type of automation is needed (desktop, browser, or both)
2. What specific actions need to be performed
3. What applications or websites are involved
4. What data needs to be entered or extracted
5. What adaptive strategies might be needed
6. What potential obstacles exist based on history

Return your analysis in this JSON format:
{
  "type": "desktop|browser|mixed",
  "actions": ["action1", "action2", ...],
  "applications": ["app1", "app2", ...],
  "data_required": {...},
  "complexity": "simple|moderate|complex",
  "estimated_steps": number,
  "adaptive_strategies": ["strategy1", "strategy2", ...],
  "potential_obstacles": ["obstacle1", "obstacle2", ...],
  "confidence": 0.0-1.0,
  "context_insights": "what we learned from context"
}`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      const intentText = response?.choices[0]?.message?.content || '';
      
      try {
        const intent = JSON.parse(intentText);
        return {
          success: true,
          data: intent
        };
      } catch (parseError) {
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response into intent format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to understand user intent with context'
      };
    }
  }

  /**
   * Create adaptive execution plan
   */
  private async createAdaptivePlan(query: string, intent: any): Promise<AgentResponse> {
    try {
      const systemPrompt = `You are an adaptive automation planner. Create an intelligent execution plan that considers potential obstacles and includes adaptive strategies.

Request: ${query}
Intent Analysis: ${JSON.stringify(intent)}

Create a plan with these considerations:
1. Break down complex tasks into manageable steps
2. Include adaptive strategies for potential obstacles
3. Plan for error recovery and alternative approaches
4. Optimize based on user context and preferences
5. Include learning opportunities

Return plan as JSON:
{
  "steps": [
    {
      "step_number": 1,
      "type": "desktop|browser",
      "action": "specific_action",
      "parameters": {...},
      "description": "human_readable_description",
      "wait_time": 2000,
      "adaptive_strategy": "strategy_name",
      "fallback_action": "alternative_action",
      "learning_opportunity": "what we can learn"
    }
  ],
  "adaptive_features": ["feature1", "feature2", ...],
  "confidence": 0.0-1.0
}`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      const planText = response?.choices[0]?.message?.content || '';
      
      try {
        const plan = JSON.parse(planText);
        return {
          success: true,
          data: plan
        };
      } catch (parseError) {
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response into plan format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create adaptive plan'
      };
    }
  }

  /**
   * Execute step with adaptive strategies
   */
  private async executeAdaptiveStep(step: any, previousResults: any[]): Promise<AgentResponse> {
    try {
      const startTime = Date.now();
      
      // Check if adaptive strategy should be applied
      const context = {
        step,
        previousResults,
        hasUserContext: await this.sharedContext.has('user_preferences'),
        userPreferences: await this.sharedContext.get('user_preferences')
      };

      const applicableStrategy = this.adaptiveStrategies.find(strategy => 
        strategy.condition(context)
      );

      let result;
      if (applicableStrategy) {
        console.log(`🎯 Applying strategy: ${applicableStrategy.name}`);
        result = await applicableStrategy.action(step);
        applicableStrategy.usageCount++;
      } else {
        result = await this.executeStep(step);
      }

      const duration = Date.now() - startTime;
      
      return {
        success: result.success,
        data: {
          ...result.data,
          executionTime: duration,
          adaptiveStrategy: applicableStrategy?.name || 'none',
          learningOpportunity: step.learning_opportunity
        },
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to execute adaptive step'
      };
    }
  }

  /**
   * Attempt recovery from failed execution
   */
  private async attemptRecovery(step: any, error: string): Promise<AgentResponse> {
    try {
      console.log(`🔄 Attempting recovery for step: ${step.description}`);
      
      // Find applicable recovery strategies
      const recoveryStrategies = this.adaptiveStrategies.filter(strategy => 
        strategy.condition({ error, step })
      );

      for (const strategy of recoveryStrategies) {
        console.log(`🔧 Trying recovery strategy: ${strategy.name}`);
        const result = await strategy.action(step);
        
        if (result.success) {
          console.log(`✅ Recovery successful with strategy: ${strategy.name}`);
          strategy.successRate = Math.min(1.0, strategy.successRate + 0.1);
          return {
            success: true,
            data: {
              ...result.data,
              recovered: true,
              recoveryStrategy: strategy.name
            }
          };
        }
      }

      return {
        success: false,
        data: null,
        error: 'All recovery strategies failed'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Recovery attempt failed'
      };
    }
  }

  /**
   * Record execution for learning
   */
  private recordExecution(step: any, result: AgentResponse): void {
    const execution: ExecutionRecord = {
      timestamp: new Date(),
      action: step.action,
      parameters: step.parameters,
      success: result.success,
      duration: result.data?.executionTime || 0,
      error: result.error,
      adaptation: result.data?.adaptiveStrategy
    };

    this.executionHistory.push(execution);
    
    // Keep only last 50 executions for memory efficiency
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }

  /**
   * Perform learning reflection
   */
  private async performLearningReflection(query: string, results: AgentResponse[]): Promise<void> {
    try {
      console.log('🧠 Performing learning reflection...');
      
      const successfulSteps = results.filter(r => r.success).length;
      const totalSteps = results.length;
      const successRate = totalSteps > 0 ? successfulSteps / totalSteps : 0;

      // Update strategy success rates
      const usedStrategies = results
        .map(r => r.data?.adaptiveStrategy)
        .filter(Boolean)
        .reduce((acc, strategy) => {
          acc[strategy] = (acc[strategy] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      for (const [strategyName, usageCount] of Object.entries(usedStrategies)) {
        const strategy = this.adaptiveStrategies.find(s => s.name === strategyName);
        if (strategy) {
          const strategySuccessRate = results
            .filter(r => r.data?.adaptiveStrategy === strategyName)
            .filter(r => r.success).length / usageCount;
          
          strategy.successRate = (strategy.successRate + strategySuccessRate) / 2;
        }
      }

      // Store learning insights in shared context
      await this.sharedContext.set('automation_learning', {
        lastReflection: new Date(),
        overallSuccessRate: successRate,
        strategyPerformance: this.adaptiveStrategies.map(s => ({
          name: s.name,
          successRate: s.successRate,
          usageCount: s.usageCount
        })),
        recentQuery: query,
        insights: this.generateLearningInsights(results)
      });

      console.log('✅ Learning reflection completed');
    } catch (error) {
      console.error('Learning reflection failed:', error);
    }
  }

  /**
   * Generate learning insights
   */
  private generateLearningInsights(results: AgentResponse[]): string[] {
    const insights = [];
    
    const successRate = results.filter(r => r.success).length / results.length;
    if (successRate > 0.8) {
      insights.push('High success rate achieved - current strategies are effective');
    } else if (successRate < 0.5) {
      insights.push('Low success rate detected - consider reviewing strategies');
    }

    const adaptiveSteps = results.filter(r => r.data?.adaptiveStrategy && r.data.adaptiveStrategy !== 'none');
    if (adaptiveSteps.length > 0) {
      insights.push(`${adaptiveSteps.length} steps used adaptive strategies`);
    }

    const recoveredSteps = results.filter(r => r.data?.recovered);
    if (recoveredSteps.length > 0) {
      insights.push(`${recoveredSteps.length} steps required recovery strategies`);
    }

    return insights;
  }

  /**
   * Get adaptive attempts count
   */
  private getAdaptiveAttempts(): number {
    return this.executionHistory.filter(e => e.adaptation).length;
  }

  /**
   * Get learning insights
   */
  private getLearningInsights(): string[] {
    return this.generateLearningInsights(this.executionHistory.map(e => ({
      success: e.success,
      data: { adaptiveStrategy: e.adaptation }
    })));
  }

  /**
   * Get used strategies
   */
  private getUsedStrategies(): string[] {
    return [...new Set(this.executionHistory.map(e => e.adaptation).filter(Boolean))];
  }

  /**
   * Execute agent action (helper method)
   */
  private async executeAgentAction(step: any): Promise<AgentResponse> {
    // This would integrate with the existing agent execution logic
    return await this.executeStep(step);
  }
}
