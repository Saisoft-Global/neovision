import { EventBus } from '../events/EventBus';
import type { AgentRequest, AgentResponse } from '../../types/agent';
import { determineIntent } from './intentAnalyzer';
import { createWorkflow } from './workflowGenerator';
import { prioritizeActions } from './actionPrioritizer';
import { isServiceConfigured } from '../../config/environment';
import { WorkflowMatcher } from '../workflow/WorkflowMatcher';
import { EnhancedWorkflowExecutor } from '../workflow/EnhancedWorkflowExecutor';
import { AgentFactory } from '../agent/AgentFactory';
import { createChatCompletion } from '../openai/chat';
// import { universalBrowserAutomationAgent } from '../automation/UniversalBrowserAutomationAgent';
import { SharedContext } from '../context/SharedContext';
import { getDomainPrompt } from '../chat/prompts/domainPrompts';
import { getAgentContext } from '../chat/context/agentContext';
import { MemoryService } from '../memory/MemoryService';
import type { BaseAgent } from '../agent/BaseAgent';
import type { AgentContext } from '../agent/types';

interface POARState {
  currentGoal: string;
  plan: PlanStep[];
  observations: Observation[];
  actions: Action[];
  reflections: Reflection[];
  context: Record<string, any>;
  iteration: number;
  maxIterations: number;
  learningMemory: LearningMemory;
  adaptiveStrategies: AdaptiveStrategy[];
  errorRecovery: ErrorRecoveryState;
}

interface LearningMemory {
  successfulPatterns: SuccessfulPattern[];
  failedAttempts: FailedAttempt[];
  websitePatterns: WebsitePattern[];
  userPreferences: UserPreference[];
  lastUpdated: Date;
}

interface SuccessfulPattern {
  id: string;
  pattern: string;
  context: Record<string, any>;
  successRate: number;
  lastUsed: Date;
  usageCount: number;
}

interface FailedAttempt {
  id: string;
  attempt: string;
  error: string;
  context: Record<string, any>;
  timestamp: Date;
  recoveryStrategy?: string;
}

interface WebsitePattern {
  domain: string;
  elementSelectors: Record<string, string>;
  navigationPatterns: string[];
  formPatterns: FormPattern[];
  lastAnalyzed: Date;
  confidence: number;
}

interface FormPattern {
  formType: string;
  fieldMappings: Record<string, string>;
  submitSelector: string;
  validationRules: string[];
}

interface UserPreference {
  userId: string;
  automationPreferences: Record<string, any>;
  voiceSettings: VoiceSettings;
  interactionHistory: InteractionRecord[];
}

interface VoiceSettings {
  language: string;
  speed: number;
  confirmationRequired: boolean;
}

interface InteractionRecord {
  timestamp: Date;
  intent: string;
  success: boolean;
  duration: number;
  satisfaction?: number;
}

interface AdaptiveStrategy {
  id: string;
  name: string;
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  successRate: number;
  lastUsed: Date;
}

interface StrategyCondition {
  type: 'element_exists' | 'page_loaded' | 'error_occurred' | 'user_feedback';
  value: any;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
}

interface StrategyAction {
  type: 'wait' | 'retry' | 'alternative_selector' | 'ask_user' | 'skip_step';
  parameters: Record<string, any>;
}

interface ErrorRecoveryState {
  currentError: string | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  recoveryStrategies: RecoveryStrategy[];
  lastRecovery: Date | null;
}

interface RecoveryStrategy {
  id: string;
  name: string;
  errorPattern: string;
  recoveryActions: RecoveryAction[];
  successRate: number;
}

interface RecoveryAction {
  type: 'retry' | 'alternative_approach' | 'user_assistance' | 'skip_and_continue';
  parameters: Record<string, any>;
  confidence: number;
}

interface PlanStep {
  id: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  expectedOutcome: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  learningOpportunity?: string;
}

interface Observation {
  timestamp: Date;
  source: string;
  data: any;
  relevance: number;
  confidence: number;
}

interface Action {
  id: string;
  planStepId: string;
  type: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  timestamp: Date;
  duration: number;
}

interface Reflection {
  timestamp: Date;
  goal: string;
  observations: Observation[];
  actions: Action[];
  analysis: string;
  insights: string[];
  nextSteps: string[];
  confidence: number;
}

export class OrchestratorAgent {
  private static instance: OrchestratorAgent | null = null;
  private eventBus: EventBus;
  private agentFactory: AgentFactory;
  private agentCache: Map<string, any>;
  private poarState: POARState | null = null;
  private sharedContext: SharedContext;
  private learningMemory: LearningMemory;
  private adaptiveStrategies: AdaptiveStrategy[];
  private errorRecovery: ErrorRecoveryState;
  private memory: MemoryService;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.agentFactory = AgentFactory.getInstance();
    this.agentCache = new Map();
    this.sharedContext = SharedContext.getInstance();
    this.learningMemory = this.initializeLearningMemory();
    this.adaptiveStrategies = this.initializeAdaptiveStrategies();
    this.errorRecovery = this.initializeErrorRecovery();
    this.memory = MemoryService.getInstance();
  }

  public static getInstance(): OrchestratorAgent {
    if (!this.instance) {
      this.instance = new OrchestratorAgent();
    }
    return this.instance;
  }

  // Initialize learning memory with persistent storage
  private initializeLearningMemory(): LearningMemory {
    const stored = localStorage.getItem('orchestrator_learning_memory');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse stored learning memory, using defaults');
      }
    }
    
    return {
      successfulPatterns: [],
      failedAttempts: [],
      websitePatterns: [],
      userPreferences: [],
      lastUpdated: new Date()
    };
  }

  // Initialize adaptive strategies
  private initializeAdaptiveStrategies(): AdaptiveStrategy[] {
    return [
      {
        id: 'wait_for_element',
        name: 'Wait for Element Strategy',
        conditions: [
          { type: 'element_exists', value: false, operator: 'equals' }
        ],
        actions: [
          { type: 'wait', parameters: { duration: 2000 } },
          { type: 'retry', parameters: { maxAttempts: 3 } }
        ],
        successRate: 0.85,
        lastUsed: new Date()
      },
      {
        id: 'alternative_selector',
        name: 'Alternative Selector Strategy',
        conditions: [
          { type: 'error_occurred', value: 'element_not_found', operator: 'equals' }
        ],
        actions: [
          { type: 'alternative_selector', parameters: { fallbackSelectors: [] } },
          { type: 'retry', parameters: { maxAttempts: 2 } }
        ],
        successRate: 0.70,
        lastUsed: new Date()
      },
      {
        id: 'user_assistance',
        name: 'User Assistance Strategy',
        conditions: [
          { type: 'error_occurred', value: 'multiple_failures', operator: 'equals' }
        ],
        actions: [
          { type: 'ask_user', parameters: { message: 'I need your help to continue' } },
          { type: 'wait', parameters: { duration: 30000 } }
        ],
        successRate: 0.95,
        lastUsed: new Date()
      }
    ];
  }

  // Initialize error recovery state
  /**
   * Extract JSON from AI response that might contain markdown formatting
   */
  private extractJSONFromResponse(response: string): any {
    try {
      // First try direct parsing
      return JSON.parse(response);
    } catch (error) {
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        
        // Try to extract JSON from the response text
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonText = response.substring(jsonStart, jsonEnd);
          return JSON.parse(jsonText);
        }
        
        // Try array format
        const arrayStart = response.indexOf('[');
        const arrayEnd = response.lastIndexOf(']') + 1;
        if (arrayStart !== -1 && arrayEnd > arrayStart) {
          const arrayText = response.substring(arrayStart, arrayEnd);
          return JSON.parse(arrayText);
        }
        
        throw new Error('No valid JSON found in response');
      } catch (parseError) {
        console.error('Failed to extract JSON from response:', response);
        console.error('Parse error:', parseError);
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
  }

  private initializeErrorRecovery(): ErrorRecoveryState {
    return {
      currentError: null,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
      recoveryStrategies: [
        {
          id: 'retry_strategy',
          name: 'Simple Retry',
          errorPattern: 'timeout|network_error',
          recoveryActions: [
            { type: 'retry', parameters: { delay: 1000, maxAttempts: 3 }, confidence: 0.8 }
          ],
          successRate: 0.75
        },
        {
          id: 'alternative_approach',
          name: 'Alternative Approach',
          errorPattern: 'element_not_found|selector_invalid',
          recoveryActions: [
            { type: 'alternative_approach', parameters: { useFallback: true }, confidence: 0.6 }
          ],
          successRate: 0.65
        },
        {
          id: 'user_guidance',
          name: 'User Guidance',
          errorPattern: 'authentication_failed|permission_denied',
          recoveryActions: [
            { type: 'user_assistance', parameters: { requestGuidance: true }, confidence: 0.9 }
          ],
          successRate: 0.90
        }
      ],
      lastRecovery: null
    };
  }

  public async processRequest(input: unknown): Promise<AgentResponse> {
    try {
      // Check if OpenAI is configured
      if (!isServiceConfigured('openai')) {
        return {
          success: false,
          data: null,
          error: 'OpenAI API key not configured. Please check your environment variables.'
        };
      }

      // If this is a simple chat message with agent context, handle via direct chat generation
      if (this.isChatInput(input)) {
        const directChat = await this.generateChatResponse(input as any);
        return {
          success: true,
          data: { message: directChat }
        };
      }

      // Enhanced goal-oriented intent parsing for complex or non-chat inputs
      const goalAnalysis = await this.analyzeGoal(input);
      
      // Check if this is a complex request that needs POAR cycle
      const shouldUsePOAR = await this.shouldUsePOARCycle(input, goalAnalysis);
      
      if (shouldUsePOAR) {
        console.log('🔄 Starting POAR cycle for complex request...');
        return await this.executePOARCycle(input);
      } else {
        console.log('⚡ Using direct execution for simple request...');
        return await this.executeDirectly(input);
      }

    } catch (error) {
      // Handle OpenAI specific errors
      if (error?.name === 'OpenAIError') {
        const message = this.handleOpenAIError(error);
        this.eventBus.emit('processingError', { error: message });
        return {
          success: false,
          data: null,
          error: message
        };
      }

      // Handle other errors
      console.error('Orchestrator error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.eventBus.emit('processingError', { error: message });
      
      return {
        success: false,
        data: null,
        error: message
      };
    }
  }

  private isChatInput(input: unknown): input is { message: string; agent: any } {
    return !!(input && typeof input === 'object' && (input as any).message && (input as any).agent);
  }

  private async generateChatResponse(input: { 
    message: string; 
    agent: any;
    userId?: string;
    conversationHistory?: any[];
    relevantMemories?: any[];
    tokenStats?: any;
    context?: any;
  }): Promise<string> {
    const { message, agent, userId, conversationHistory, relevantMemories, tokenStats, context } = input;
    
    console.log('🎬 OrchestratorAgent.generateChatResponse started');
    
    // NEW: Check if this message should trigger a workflow
    if (agent && agent.id) {
      console.log('🔍 Checking for workflow trigger...');
      try {
        const workflowMatch = await Promise.race([
          this.checkForWorkflowTrigger(agent.id, message, input),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Workflow check timeout')), 3000))
        ]);
        
        if (workflowMatch) {
          console.log(`🔄 Triggering workflow: ${workflowMatch.workflow.name} (confidence: ${workflowMatch.confidence})`);
          return await this.executeWorkflowAndRespond(workflowMatch.workflow, agent, input);
        }
        console.log('✅ No workflow match, proceeding with normal response');
      } catch (error) {
        console.warn('⚠️ Workflow check failed/timeout:', error);
        // Continue with normal response
      }
    }
    
    // ✨ NEW: Use RAG-powered response generation if agent instance is available
    if (agent && agent.id && userId) {
      try {
        console.log(`🧠 Using RAG-powered response for agent: ${agent.id}`);
        
        // Get agent instance from factory
        console.log('📦 Loading agent instance...');
        const agentInstance = await Promise.race([
          AgentFactory.getInstance().getAgentInstance(agent.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Agent instance loading timeout')), 5000))
        ]);
        console.log('✅ Agent instance loaded');
        
        // Convert conversation history to required format
        const formattedHistory = (conversationHistory || []).map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || msg.message || ''
        }));
        
        // Build agent context
        const agentContext: AgentContext = {
          conversationHistory: formattedHistory,
          relevantMemories: relevantMemories || [],
          documentContext: context?.documentContext || null,
          sharedContext: context?.sharedContext || {},
          userInfo: { userId },
          timestamp: new Date().toISOString()
        };
        
        console.log('🚀 Calling generateEnhancedResponse...');
        // ✨ USE ENHANCED RESPONSE GENERATION (with citations, journey tracking, suggestions)!
        const response = await Promise.race([
          (agentInstance as any).generateEnhancedResponse(
            message,
            formattedHistory,
            userId,
            agentContext
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Enhanced response timeout after 30s')), 30000))
        ]) as string;
        
        console.log('✅ Enhanced response generated');
        
        console.log(`✅ Enhanced response generated successfully (with sources and journey tracking)`);
        return response;
        
      } catch (error) {
        console.error('RAG-powered response generation failed, falling back to direct LLM:', error);
        // Fall through to fallback methods
      }
    }
    
    // FALLBACK 1: If conversation history is provided, use it directly (already optimized by ChatProcessor)
    if (conversationHistory && conversationHistory.length > 0) {
      console.log(`💬 Using conversation history (fallback): ${conversationHistory.length} messages`);
      console.log(`📊 Token usage: ${tokenStats?.usagePercentage || 0}%`);
      
      // Add relevant memories to context if available
      if (relevantMemories && relevantMemories.length > 0) {
        console.log(`🧠 Including ${relevantMemories.length} relevant memories`);
      }
      
      // Use the optimized conversation history
      const response = await createChatCompletion(conversationHistory);
      return response?.choices[0]?.message?.content || 'No response generated';
    }
    
    // FALLBACK 2: Build context without history (for backward compatibility)
    console.log(`⚠️ Using basic fallback (no RAG, no history)`);
    const systemPrompt = getDomainPrompt(agent.type);
    const agentCtx = await getAgentContext(agent, message);
    const contextMessage = `Context:\n${JSON.stringify(agentCtx)}`;

    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'system', content: contextMessage },
      { role: 'user', content: message }
    ]);

    return response?.choices[0]?.message?.content || '';
  }


  private async executeDirectly(input: unknown): Promise<AgentResponse> {
    // Original logic for simple requests
    const intent = await determineIntent(input);
    const workflow = await createWorkflow(intent, input);
    const prioritizedActions = prioritizeActions(workflow);

    // Execute workflow
    const results = await this.executeWorkflow(prioritizedActions);
    
    this.eventBus.emit('requestProcessed', { 
      success: true, 
      results 
    });

    return {
      success: true,
      data: results[results.length - 1] // Return last result as response
    };
  }

  private async executePOARCycle(input: unknown): Promise<AgentResponse> {
    const goal = typeof input === 'string' ? input : JSON.stringify(input);
    
    // Initialize POAR state
    this.poarState = {
      currentGoal: goal,
      plan: [],
      observations: [],
      actions: [],
      reflections: [],
      context: {},
      iteration: 0,
      maxIterations: 5, // Prevent infinite loops
      learningMemory: this.learningMemory,
      adaptiveStrategies: this.adaptiveStrategies,
      errorRecovery: this.errorRecovery
    };

    console.log(`🎯 POAR Goal: ${goal}`);

    // Execute POAR cycle
    while (this.poarState.iteration < this.poarState.maxIterations) {
      console.log(`🔄 POAR Iteration ${this.poarState.iteration + 1}`);
      
      // 1. PLAN
      await this.plan();
      
      // 2. OBSERVE
      await this.observe();
      
      // 3. ACT
      const shouldContinue = await this.act();
      
      // 4. REFLECT
      const shouldStop = await this.reflect();
      
      if (shouldStop || !shouldContinue) {
        break;
      }
      
      this.poarState.iteration++;
    }

    // Return final result
    const finalReflection = this.poarState.reflections[this.poarState.reflections.length - 1];
    
    this.eventBus.emit('requestProcessed', { 
      success: true, 
      results: [finalReflection]
    });

    return {
      success: true,
      data: {
        goal: this.poarState.currentGoal,
        iterations: this.poarState.iteration + 1,
        finalReflection,
        poarState: this.poarState
      }
    };
  }

  private async executeWorkflow(actions: AgentRequest[]): Promise<unknown[]> {
    const results: unknown[] = [];
    const context: Record<string, unknown> = {};

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push(result);
        (context as any)[action.type] = result;
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        throw error;
      }
    }

    return results;
  }

  private async executeAction(
    action: AgentRequest, 
    context: Record<string, unknown>
  ): Promise<unknown> {
    const agent = await this.getAgentForAction(action.type);
    if (!agent) {
      throw new Error(`No agent found for action type: ${action.type}`);
    }

    return agent.execute(action.action, {
      ...action.payload,
      context
    });
  }

  private async getAgentForAction(type: string): Promise<any> {
    // Check cache first
    if (this.agentCache.has(type)) {
      return this.agentCache.get(type);
    }

    // Create new agent instance
    let agent;
    const config = {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    };

    // Instantiate via factory to avoid direct class imports
    agent = await this.agentFactory.createAgent(type, config);

    // Cache the agent instance
    this.agentCache.set(type, agent);
    return agent;
  }

  private handleOpenAIError(error: any): string {
    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.status === 401) {
      return 'OpenAI API key is invalid. Please check your configuration.';
    }
    if (error.status === 503) {
      return 'OpenAI service is temporarily unavailable. Please try again later.';
    }
    return 'An error occurred while processing your request. Please try again.';
  }

  onRequestProcessed(callback: (data: { success: boolean; results: unknown[] }) => void): void {
    this.eventBus.on('requestProcessed', callback);
  }

  onProcessingError(callback: (data: { error: string }) => void): void {
    this.eventBus.on('processingError', callback);
  }

  // POAR Cycle Methods
  private async plan(): Promise<void> {
    if (!this.poarState) return;
    
    console.log('📋 PLANNING: Creating autonomous execution plan...');
    
    // Use enhanced autonomous planning with goal analysis
    const goalAnalysis = await this.analyzeGoal(this.poarState.currentGoal);
    const autonomousPlan = await this.createAutonomousPlan(this.poarState.currentGoal, goalAnalysis);
    
    // Store goal analysis in context for future use
    this.poarState.context.goalAnalysis = goalAnalysis;
    
    try {
      // Use autonomous plan or fallback to LLM-based planning
      const planData = autonomousPlan.length > 0 ? 
        { steps: autonomousPlan, reasoning: "Autonomous planning with learning insights" } :
        { steps: [] };
      
      // Update plan with new steps
      this.poarState.plan = planData.steps.map((step: any) => ({
        ...step,
        status: 'pending' as const
      }));
      
      console.log(`✅ Plan created with ${this.poarState.plan.length} steps`);
      
    } catch (error) {
      console.error('❌ Failed to parse plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  private async observe(): Promise<void> {
    if (!this.poarState) return;
    
    console.log('👁️ OBSERVING: Gathering contextual information...');
    
    // Use enhanced contextual observation
    const contextualObservations = await this.gatherContextualObservations(this.poarState.currentGoal);
    
    // Add system status observations
    const systemObservations: Observation[] = [
      {
        timestamp: new Date(),
        source: 'system',
        data: await this.observeSystemState(),
        relevance: 0.8,
        confidence: 0.9
      },
      {
        timestamp: new Date(),
        source: 'plan_progress',
        data: this.analyzePlanProgress(),
        relevance: 0.9,
        confidence: 0.8
      },
      {
        timestamp: new Date(),
        source: 'agent_status',
        data: await this.observeAgentStatus(),
        relevance: 0.7,
        confidence: 0.9
      }
    ];
    
    // Combine contextual and system observations
    this.poarState.observations.push(...contextualObservations, ...systemObservations);
    console.log(`✅ Gathered ${contextualObservations.length + systemObservations.length} observations`);
  }

  private async act(): Promise<boolean> {
    if (!this.poarState) return false;
    
    console.log('🎬 ACTING: Executing planned actions...');
    
    let shouldContinue = true;
    
    // Find next actionable step
    const nextStep = this.poarState.plan.find(step => 
      step.status === 'pending' && 
      this.areDependenciesMet(step.dependencies)
    );
    
    if (!nextStep) {
      console.log('⏹️ No more actionable steps found');
      return false;
    }
    
    console.log(`🎯 Executing step: ${nextStep.description}`);
    nextStep.status = 'in_progress';
    
    try {
      const startTime = Date.now();
      
      // Execute the action using enhanced adaptive execution
      const result = await this.executeAdaptiveAction(nextStep);
      
      const duration = Date.now() - startTime;
      
      // Record action
      const action: Action = {
        id: crypto.randomUUID(),
        planStepId: nextStep.id,
        type: nextStep.action,
        parameters: nextStep.parameters,
        result: result,
        success: true,
        timestamp: new Date(),
        duration
      };
      
      this.poarState.actions.push(action);
      nextStep.status = 'completed';
      
      console.log(`✅ Step completed: ${nextStep.description}`);
      
      // Check if we need to continue
      const remainingSteps = this.poarState.plan.filter(step => step.status === 'pending');
      if (remainingSteps.length === 0) {
        shouldContinue = false;
      }
      
    } catch (error) {
      console.error(`❌ Step failed: ${nextStep.description}`, error);
      
      const action: Action = {
        id: crypto.randomUUID(),
        planStepId: nextStep.id,
        type: nextStep.action,
        parameters: nextStep.parameters,
        result: { error: error instanceof Error ? error.message : String(error) },
        success: false,
        timestamp: new Date(),
        duration: 0
      };
      
      this.poarState.actions.push(action);
      nextStep.status = 'failed';
      
      // Decide whether to continue after failure
      shouldContinue = await this.shouldContinueAfterFailure(nextStep, error);
    }
    
    return shouldContinue;
  }

  private async reflect(): Promise<boolean> {
    if (!this.poarState) return true;
    
    console.log('🤔 REFLECTING: Analyzing results and planning next steps...');
    
    const reflectionPrompt = `
Analyze the current POAR cycle and determine next steps.

Goal: "${this.poarState.currentGoal}"
Iteration: ${this.poarState.iteration + 1}

Plan Status:
${this.poarState.plan.map(step => `- ${step.id}: ${step.status} - ${step.description}`).join('\n')}

Recent Actions:
${this.poarState.actions.slice(-3).map(action => `- ${action.type}: ${action.success ? 'SUCCESS' : 'FAILED'}`).join('\n')}

Recent Observations:
${this.poarState.observations.slice(-3).map(obs => `- ${obs.source}: ${JSON.stringify(obs.data)}`).join('\n')}

Analyze:
1. What went well?
2. What went wrong?
3. What did we learn?
4. Should we continue or stop?
5. What should we do differently?

Return in this JSON format:
{
  "analysis": "Detailed analysis of what happened",
  "insights": ["insight1", "insight2"],
  "nextSteps": ["next step 1", "next step 2"],
  "confidence": 0.8,
  "shouldStop": false,
  "reasoning": "Why we should continue or stop"
}`;

    const response = await this.callLLM(reflectionPrompt);
    
    try {
      const reflectionData = this.extractJSONFromResponse(response);
      
      const reflection: Reflection = {
        timestamp: new Date(),
        goal: this.poarState.currentGoal,
        observations: this.poarState.observations.slice(-5),
        actions: this.poarState.actions.slice(-5),
        analysis: reflectionData.analysis,
        insights: reflectionData.insights,
        nextSteps: reflectionData.nextSteps,
        confidence: reflectionData.confidence
      };
      
      this.poarState.reflections.push(reflection);

      // Record episodic summary (Episodic memory)
      try {
        await this.memory.recordEpisodicSummary({
          userId: 'current_user',
          threadId: 'current_thread',
          goal: this.poarState.currentGoal,
          observations: this.poarState.observations.slice(-10),
          actions: this.poarState.actions.slice(-10),
          reflections: [reflection]
        });
      } catch {}
      
      // Perform learning reflection to improve future performance
      await this.performLearningReflection(
        this.poarState.currentGoal,
        this.poarState.observations,
        this.poarState.actions
      );
      
      console.log(`✅ Reflection completed. Confidence: ${reflection.confidence}`);
      console.log(`💡 Insights: ${reflection.insights.join(', ')}`);
      
      return reflectionData.shouldStop || false;
      
    } catch (error) {
      console.error('❌ Failed to parse reflection:', error);
      return true; // Stop if we can't reflect
    }
  }

  // Helper methods for POAR
  private async callLLM(prompt: string): Promise<string> {
    const { createChatCompletion } = await import('../openai/chat');
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'You are an AI orchestrator that helps plan and execute complex tasks using multiple specialized agents.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    return response?.choices[0]?.message?.content || '{}';
  }

  private async executeAgentAction(step: PlanStep): Promise<any> {
    // Use existing agent execution logic
    const agent = await this.getAgentForAction(step.action);
    if (!agent) {
      throw new Error(`No agent found for action type: ${step.action}`);
    }

    return agent.execute('execute', {
      ...step.parameters,
      context: this.poarState?.context
    });
  }

  private areDependenciesMet(dependencies: string[]): boolean {
    if (!this.poarState) return true;
    
    return dependencies.every(depId => 
      this.poarState!.plan.find(step => step.id === depId)?.status === 'completed'
    );
  }

  private async shouldContinueAfterFailure(step: PlanStep, error: any): Promise<boolean> {
    if (!this.poarState) return false;
    
    // Simple heuristic: continue if less than 50% of steps have failed
    const failedSteps = this.poarState.plan.filter(s => s.status === 'failed').length;
    const totalSteps = this.poarState.plan.length;
    
    if (failedSteps / totalSteps > 0.5) {
      console.log('🛑 Too many failures, stopping execution');
      return false;
    }
    
    console.log('🔄 Continuing despite failure');
    return true;
  }

  private async observeSystemState(): Promise<any> {
    if (!this.poarState) return {};
    
    return {
      timestamp: new Date(),
      planProgress: {
        total: this.poarState.plan.length,
        completed: this.poarState.plan.filter(s => s.status === 'completed').length,
        failed: this.poarState.plan.filter(s => s.status === 'failed').length,
        pending: this.poarState.plan.filter(s => s.status === 'pending').length
      },
      actionsExecuted: this.poarState.actions.length,
      iterations: this.poarState.iteration
    };
  }

  private analyzePlanProgress(): any {
    if (!this.poarState) return {};
    
    return {
      completionRate: this.poarState.plan.filter(s => s.status === 'completed').length / this.poarState.plan.length,
      failureRate: this.poarState.plan.filter(s => s.status === 'failed').length / this.poarState.plan.length,
      nextActionableStep: this.poarState.plan.find(s => s.status === 'pending')?.id
    };
  }

  private async observeAgentStatus(): Promise<any> {
    // Check availability of different agent types
    const agentTypes = ['knowledge', 'email', 'meeting', 'task', 'desktop_automation', 'crm_email'];
    const status = {};
    
    for (const type of agentTypes) {
      try {
        const agent = await this.getAgentForAction(type);
        status[type] = agent ? 'available' : 'unavailable';
      } catch (error) {
        status[type] = 'error';
      }
    }
    
    return status;
  }

  // ============ ENHANCED AGENTIC CAPABILITIES ============

  /**
   * Goal-Oriented Intent Analysis - Understands user's ultimate goal, not just immediate request
   */
  private async analyzeGoal(input: unknown): Promise<any> {
    try {
      const inputText = typeof input === 'string' ? input : JSON.stringify(input);
      
      const systemPrompt = `You are an advanced AI goal analyzer. Analyze the user's request to understand their ultimate goal, not just the immediate task.

Return your analysis in this JSON format:
{
  "immediate_task": "what the user directly asked for",
  "ultimate_goal": "what the user really wants to achieve",
  "goal_type": "purchase|research|automation|communication|information|creation",
  "complexity": "simple|moderate|complex|multi_step",
  "dependencies": ["step1", "step2", ...],
  "success_criteria": ["criterion1", "criterion2", ...],
  "potential_obstacles": ["obstacle1", "obstacle2", ...],
  "estimated_duration": "minutes|hours|days",
  "requires_human_intervention": true|false,
  "confidence": 0.0-1.0
}

Examples:
- "Buy Samsung mobile from Flipkart" → {"immediate_task": "purchase mobile", "ultimate_goal": "acquire working smartphone", "goal_type": "purchase", "complexity": "moderate", "requires_human_intervention": true}
- "Research competitors" → {"immediate_task": "find competitor info", "ultimate_goal": "understand market position", "goal_type": "research", "complexity": "complex", "requires_human_intervention": false}`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText }
      ]);

      const analysisText = response?.choices[0]?.message?.content || '{}';
      return this.extractJSONFromResponse(analysisText);
    } catch (error) {
      console.error('Goal analysis failed:', error);
      return {
        immediate_task: String(input),
        ultimate_goal: String(input),
        goal_type: 'automation',
        complexity: 'simple',
        dependencies: [],
        success_criteria: [],
        potential_obstacles: [],
        estimated_duration: 'minutes',
        requires_human_intervention: false,
        confidence: 0.5
      };
    }
  }

  /**
   * Enhanced POAR Cycle Decision Making - Determines if request needs autonomous planning
   */
  private async shouldUsePOARCycle(input: unknown, goalAnalysis: any): Promise<boolean> {
    try {
      // Use goal analysis to determine complexity
      const complexityFactors = {
        hasMultipleSteps: goalAnalysis.dependencies?.length > 2,
        requiresAdaptation: goalAnalysis.potential_obstacles?.length > 0,
        needsLearning: goalAnalysis.goal_type === 'research' || goalAnalysis.goal_type === 'automation',
        hasHumanInteraction: goalAnalysis.requires_human_intervention,
        isComplex: goalAnalysis.complexity === 'complex' || goalAnalysis.complexity === 'multi_step'
      };

      const complexityScore = Object.values(complexityFactors).filter(Boolean).length;
      
      // Use POAR for complex, adaptive, or learning-intensive tasks
      return complexityScore >= 2 || goalAnalysis.confidence < 0.7;
    } catch (error) {
      console.error('POAR decision failed:', error);
      return false; // Default to simple execution
    }
  }

  /**
   * Autonomous Planning Engine - Creates intelligent execution plans
   */
  private async createAutonomousPlan(goal: string, goalAnalysis: any): Promise<PlanStep[]> {
    try {
      const systemPrompt = `You are an autonomous AI planner. Create an intelligent execution plan for the user's goal.

Goal: ${goal}
Analysis: ${JSON.stringify(goalAnalysis)}

Create a plan with these considerations:
1. Break down the ultimate goal into achievable steps
2. Consider potential obstacles and include contingency plans
3. Include learning opportunities to improve future execution
4. Plan for human intervention when needed
5. Optimize for efficiency and success rate

Return plan as JSON array:
[
  {
    "id": "step_1",
    "description": "human readable description",
    "action": "agent_action_type",
    "parameters": {...},
    "dependencies": ["step_0"],
    "expectedOutcome": "what should happen",
    "priority": 1-10,
    "status": "pending",
    "contingencyPlan": {...},
    "learningOpportunity": "what we can learn from this step"
  }
]

Available actions: knowledge_search, email_processing, meeting_schedule, task_creation, desktop_automation, browser_automation, crm_integration, user_interaction`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a plan for: ${goal}` }
      ]);

      const planText = response?.choices[0]?.message?.content || '[]';
      const plan = this.extractJSONFromResponse(planText);
      
      // Enhance plan with learning memory insights
      return this.enhancePlanWithMemory(plan);
    } catch (error) {
      console.error('Autonomous planning failed:', error);
      return [{
        id: 'fallback_step',
        description: 'Execute basic request',
        action: 'direct_execution',
        parameters: { input: goal },
        dependencies: [],
        expectedOutcome: 'Basic request completion',
        priority: 5,
        status: 'pending' as const
      }];
    }
  }

  /**
   * Context-Aware Observation Engine - Gathers relevant information from multiple sources
   */
  private async gatherContextualObservations(goal: string): Promise<Observation[]> {
    try {
      const observations: Observation[] = [];
      
      // 1. Gather user preferences from memory
      const userPreferences = this.learningMemory.userPreferences.find(p => p.userId === 'current_user');
      if (userPreferences) {
        observations.push({
          timestamp: new Date(),
          source: 'user_preferences',
          data: userPreferences,
          relevance: 0.9,
          confidence: 0.8
        });
      }

      // 2. Check for similar successful patterns
      const similarPatterns = this.learningMemory.successfulPatterns.filter(p => 
        p.pattern.toLowerCase().includes(goal.toLowerCase().split(' ')[0])
      );
      if (similarPatterns.length > 0) {
        observations.push({
          timestamp: new Date(),
          source: 'successful_patterns',
          data: similarPatterns.slice(0, 3), // Top 3 similar patterns
          relevance: 0.8,
          confidence: 0.7
        });
      }

      // 3. Check for known obstacles
      const relevantFailures = this.learningMemory.failedAttempts.filter(f => 
        f.attempt.toLowerCase().includes(goal.toLowerCase().split(' ')[0])
      );
      if (relevantFailures.length > 0) {
        observations.push({
          timestamp: new Date(),
          source: 'known_obstacles',
          data: relevantFailures.slice(0, 2), // Recent failures
          relevance: 0.9,
          confidence: 0.8
        });
      }

      // 4. Gather current system context
      const systemContext = {} as Record<string, unknown>;
      observations.push({
        timestamp: new Date(),
        source: 'system_context',
        data: systemContext,
        relevance: 0.6,
        confidence: 0.9
      });

      return observations;
    } catch (error) {
      console.error('Contextual observation failed:', error);
      return [];
    }
  }

  /**
   * Adaptive Action Executor - Executes actions with intelligent adaptation
   */
  private async executeAdaptiveAction(step: PlanStep): Promise<any> {
    try {
      console.log(`🎯 Executing adaptive action: ${step.description}`);
      
      // Check if we have adaptive strategies for this step
      const applicableStrategies = this.adaptiveStrategies.filter(strategy =>
        strategy.conditions.some(condition => this.evaluateCondition(condition, step))
      );

      if (applicableStrategies.length > 0) {
        console.log(`🔄 Applying adaptive strategies: ${applicableStrategies.map(s => s.name).join(', ')}`);
        
        // Execute pre-actions from strategies
        for (const strategy of applicableStrategies) {
          for (const action of strategy.actions) {
            await this.executeStrategyAction(action, step);
          }
        }
      }

      // Execute the main action
      const result = await this.executeAgentAction(step);
      
      // Update strategy success rates
      if (result.success) {
        applicableStrategies.forEach(strategy => {
          strategy.successRate = Math.min(1.0, strategy.successRate + 0.1);
          strategy.lastUsed = new Date();
        });
      }

      return result;
    } catch (error) {
      console.error('Adaptive action execution failed:', error);
      
      // Try error recovery
      const recoveryResult = await this.attemptErrorRecovery(error, step);
      if (recoveryResult) {
        return recoveryResult;
      }
      
      throw error;
    }
  }

  /**
   * Self-Learning Reflector - Learns from each interaction and improves
   */
  private async performLearningReflection(goal: string, observations: Observation[], actions: Action[]): Promise<void> {
    try {
      console.log('🧠 Performing learning reflection...');
      
      // Analyze successful patterns
      const successfulActions = actions.filter(a => a.success);
      if (successfulActions.length > 0) {
        const pattern = {
          id: crypto.randomUUID(),
          pattern: goal,
          context: {
            observations: observations.length,
            actions: actions.length,
            successRate: successfulActions.length / actions.length
          },
          successRate: successfulActions.length / actions.length,
          lastUsed: new Date(),
          usageCount: 1
        };

        // Check if similar pattern exists
        const existingPattern = this.learningMemory.successfulPatterns.find(p => 
          p.pattern === pattern.pattern
        );

        if (existingPattern) {
          existingPattern.successRate = (existingPattern.successRate + pattern.successRate) / 2;
          existingPattern.usageCount++;
          existingPattern.lastUsed = new Date();
        } else {
          this.learningMemory.successfulPatterns.push(pattern);
        }
      }

      // Analyze failed attempts
      const failedActions = actions.filter(a => !a.success);
      if (failedActions.length > 0) {
        failedActions.forEach(action => {
          const failedAttempt = {
            id: crypto.randomUUID(),
            attempt: goal,
            error: action.result?.error || 'Unknown error',
            context: {
              action: action.type,
              parameters: action.parameters
            },
            timestamp: new Date()
          };

          this.learningMemory.failedAttempts.push(failedAttempt);
        });
      }

      // Update learning memory timestamp
      this.learningMemory.lastUpdated = new Date();
      
      // Persist learning memory
      this.persistLearningMemory();
      
      console.log('✅ Learning reflection completed');
    } catch (error) {
      console.error('Learning reflection failed:', error);
    }
  }

  /**
   * Intelligent Error Recovery - Automatically recovers from failures
   */
  private async attemptErrorRecovery(error: any, step: PlanStep): Promise<any> {
    try {
      const errorMessage = error.message || error.toString();
      
      // Find matching recovery strategy
      const matchingStrategy = this.errorRecovery.recoveryStrategies.find(strategy =>
        new RegExp(strategy.errorPattern, 'i').test(errorMessage)
      );

      if (!matchingStrategy) {
        console.log('No recovery strategy found for error:', errorMessage);
        return null;
      }

      console.log(`🔄 Attempting recovery with strategy: ${matchingStrategy.name}`);
      
      this.errorRecovery.currentError = errorMessage;
      this.errorRecovery.recoveryAttempts++;
      this.errorRecovery.lastRecovery = new Date();

      // Execute recovery actions
      for (const recoveryAction of matchingStrategy.recoveryActions) {
        const result = await this.executeRecoveryAction(recoveryAction, step);
        if (result.success) {
          console.log('✅ Recovery successful');
          this.errorRecovery.recoveryAttempts = 0;
          this.errorRecovery.currentError = null;
          return result;
        }
      }

      console.log('❌ All recovery attempts failed');
      return null;
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);
      return null;
    }
  }

  // ============ HELPER METHODS FOR AGENTIC CAPABILITIES ============

  private enhancePlanWithMemory(plan: PlanStep[]): PlanStep[] {
    // Add learning opportunities and optimize based on past experience
    return plan.map(step => ({
      ...step,
      learningOpportunity: step.learningOpportunity || 'Monitor execution success',
      parameters: {
        ...step.parameters,
        useLearnedPatterns: true,
        adaptiveMode: true
      }
    }));
  }

  private evaluateCondition(condition: StrategyCondition, step: PlanStep): boolean {
    switch (condition.type) {
      case 'element_exists':
        return step.parameters.elementExists === condition.value;
      case 'page_loaded':
        return step.parameters.pageLoaded === condition.value;
      case 'error_occurred':
        return step.status === 'failed';
      case 'user_feedback':
        return step.parameters.userFeedback === condition.value;
      default:
        return false;
    }
  }

  private async executeStrategyAction(action: StrategyAction, step: PlanStep): Promise<void> {
    switch (action.type) {
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, action.parameters.duration));
        break;
      case 'retry':
        // Retry logic is handled in the main execution
        break;
      case 'alternative_selector':
        step.parameters.useAlternativeSelector = true;
        break;
      case 'ask_user':
        // User interaction would be handled through the UI
        console.log('User assistance needed:', action.parameters.message);
        break;
      case 'skip_step':
        step.status = 'completed';
        break;
    }
  }

  private async executeRecoveryAction(recoveryAction: RecoveryAction, step: PlanStep): Promise<any> {
    switch (recoveryAction.type) {
      case 'retry':
        await new Promise(resolve => setTimeout(resolve, recoveryAction.parameters.delay));
        return await this.executeAgentAction(step);
      case 'alternative_approach':
        step.parameters.useAlternativeApproach = true;
        return await this.executeAgentAction(step);
      case 'user_assistance':
        // Request user assistance through the UI
        console.log('Requesting user assistance for recovery');
        return { success: false, requiresUserInput: true };
      case 'skip_and_continue':
        step.status = 'completed';
        return { success: true, skipped: true };
      default:
        return { success: false };
    }
  }

  private persistLearningMemory(): void {
    try {
      localStorage.setItem('orchestrator_learning_memory', JSON.stringify(this.learningMemory));
    } catch (error) {
      console.warn('Failed to persist learning memory:', error);
    }
  }

  /**
   * Check if user message should trigger a workflow
   * Uses AI to intelligently match prompts to workflows
   */
  private async checkForWorkflowTrigger(
    agentId: string,
    userMessage: string,
    context: any
  ) {
    try {
      const workflowMatcher = WorkflowMatcher.getInstance();
      const match = await workflowMatcher.findWorkflowForIntent(
        agentId,
        userMessage,
        context
      );

      // Only trigger if confidence is high enough
      if (match && match.confidence >= 0.7) {
        console.log(`🎯 Workflow matched: ${match.workflow.name} (${Math.round(match.confidence * 100)}% confidence)`);
        console.log(`📝 Reasoning: ${match.reasoning}`);
        return match;
      }

      return null;
    } catch (error) {
      console.error('Error checking workflow trigger:', error);
      return null;
    }
  }

  /**
   * Execute workflow and generate response
   */
  private async executeWorkflowAndRespond(
    workflow: any,
    agent: any,
    input: any
  ): Promise<string> {
    try {
      const executor = new EnhancedWorkflowExecutor();
      
      // Build execution context from input
      const executionContext = {
        userId: input.userId || 'default',
        agentId: agent.id,
        inputData: {
          message: input.message,
          ...this.extractDataFromMessage(input.message),
          ...input, // Include all input data
        },
        credentials: await this.getAPICredentials(agent.id),
      };

      console.log(`🚀 Executing workflow: ${workflow.name}`);
      console.log(`📊 Execution context:`, executionContext.inputData);

      // Execute workflow
      const result = await executor.executeWorkflow(workflow, executionContext);

      // Generate AI response based on workflow results
      if (result.success) {
        const summary = await this.generateWorkflowSummary(workflow, result, input.message);
        return summary;
      } else {
        return `I attempted to execute the "${workflow.name}" workflow but encountered an error: ${result.error}. 

Would you like me to:
1. Try again
2. Execute steps manually with your guidance
3. Provide alternative solutions`;
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      return `I encountered an error while executing the workflow. Error: ${error instanceof Error ? error.message : 'Unknown error'}

How would you like me to proceed?`;
    }
  }

  /**
   * Extract structured data from user message using AI
   */
  private extractDataFromMessage(message: string): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Extract email addresses
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) data.email = emailMatch[0];

    // Extract names (after "named", "called", or capital letter patterns)
    const nameMatch = message.match(/(?:named?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) {
      const fullName = nameMatch[1];
      const parts = fullName.split(' ');
      data.full_name = fullName;
      data.first_name = parts[0];
      if (parts.length > 1) data.last_name = parts.slice(1).join(' ');
    }

    // Extract company names
    const companyMatch = message.match(/(?:from|at|company|for)\s+([A-Z][a-zA-Z\s&]+)(?:\.|,|$)/);
    if (companyMatch) data.company = companyMatch[1].trim();

    // Extract dates (basic patterns)
    const datePatterns = [
      /(?:starting|starts|start date)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        data.start_date = match[1] || match[0];
        break;
      }
    }

    // Extract role/job title
    const roleMatch = message.match(/(?:as|role|position)\s+(?:a\s+)?([a-z\s]+?)(?:\s+starting|\s+at|\s+in|,|$)/i);
    if (roleMatch) data.role = roleMatch[1].trim();

    return data;
  }

  /**
   * Get API credentials for agent's integrations
   */
  private async getAPICredentials(agentId: string): Promise<any> {
    // Fetch credentials from environment or secure store
    // In production, these should be stored encrypted in database per organization
    const credentials: any = {};

    // Google Workspace
    if (import.meta.env.VITE_GOOGLE_WORKSPACE_ACCESS_TOKEN) {
      credentials.google = {
        accessToken: import.meta.env.VITE_GOOGLE_WORKSPACE_ACCESS_TOKEN,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
      };
    }

    // Salesforce
    if (import.meta.env.VITE_SALESFORCE_ACCESS_TOKEN) {
      credentials.salesforce = {
        accessToken: import.meta.env.VITE_SALESFORCE_ACCESS_TOKEN,
        instanceUrl: import.meta.env.VITE_SALESFORCE_INSTANCE_URL,
        clientId: import.meta.env.VITE_SALESFORCE_CLIENT_ID,
        clientSecret: import.meta.env.VITE_SALESFORCE_CLIENT_SECRET,
        username: import.meta.env.VITE_SALESFORCE_USERNAME,
        password: import.meta.env.VITE_SALESFORCE_PASSWORD,
      };
    }

    // HR System (BambooHR/Workday)
    if (import.meta.env.VITE_HR_SYSTEM_API_KEY) {
      credentials.hrSystem = {
        apiKey: import.meta.env.VITE_HR_SYSTEM_API_KEY,
        domain: import.meta.env.VITE_HR_SYSTEM_DOMAIN,
      };
    }

    // Payroll (ADP/Gusto)
    if (import.meta.env.VITE_PAYROLL_API_KEY) {
      credentials.payroll = {
        apiKey: import.meta.env.VITE_PAYROLL_API_KEY,
        clientId: import.meta.env.VITE_PAYROLL_CLIENT_ID,
        clientSecret: import.meta.env.VITE_PAYROLL_CLIENT_SECRET,
      };
    }

    return credentials;
  }

  /**
   * Generate AI summary of workflow execution results
   */
  private async generateWorkflowSummary(
    workflow: any,
    result: any,
    originalMessage: string
  ): Promise<string> {
    const resultsText = result.nodeResults.map((nr: any) => `
- **${nr.nodeName}**: ${nr.success ? '✅ Success' : '❌ Failed'}
  ${nr.data ? `Result: ${JSON.stringify(nr.data, null, 2)}` : ''}
  ${nr.error ? `Error: ${nr.error}` : ''}`).join('\n');

    const prompt = `The user requested: "${originalMessage}"

I executed the workflow "${workflow.name}" with ${result.nodeResults.length} steps.

Execution Results:
${resultsText}

Total execution time: ${result.executionTime}ms

Generate a concise, friendly response to the user explaining:
1. What was accomplished
2. Any specific results or IDs created
3. Next steps (if applicable)

Be conversational, specific, and helpful. Mention concrete details from the results.`;

    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: 'You are a helpful AI assistant summarizing workflow execution results. Be specific and include details from the execution.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      return response?.choices[0]?.message?.content || 
        `✅ Workflow "${workflow.name}" completed successfully! All ${result.nodeResults.length} steps executed in ${result.executionTime}ms.`;
    } catch (error) {
      // Fallback to simple summary if AI fails
      const successCount = result.nodeResults.filter((r: any) => r.success).length;
      return `✅ Workflow "${workflow.name}" executed: ${successCount}/${result.nodeResults.length} steps completed successfully.`;
    }
  }
}