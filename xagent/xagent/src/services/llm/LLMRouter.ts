/**
 * LLM Router
 * Routes requests to appropriate LLM based on skill, task, or configuration
 */

import { LLMConfig, LLMProvider, AgentSkill } from '../../types/agent-framework';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { MistralProvider } from './providers/MistralProvider';
import { ClaudeProvider } from './providers/ClaudeProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { GroqProvider } from './providers/GroqProvider';
import { llmConfigManager, LLMConfigManager } from './LLMConfigManager';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  chat(messages: LLMMessage[], config: LLMConfig): Promise<string>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): { models: string[]; defaultModel: string };
}

/**
 * LLM Router - Intelligent routing to appropriate LLM
 */
export class LLMRouter {
  private static instance: LLMRouter;
  private providers: Map<LLMProvider, LLMProvider> = new Map();

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): LLMRouter {
    if (!this.instance) {
      this.instance = new LLMRouter();
    }
    return this.instance;
  }

  /**
   * Initialize all LLM providers
   */
  private initializeProviders(): void {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('mistral', new MistralProvider());
    this.providers.set('anthropic', new ClaudeProvider());
    this.providers.set('google', new GeminiProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('groq', new GroqProvider());
    
    // Check Ollama availability
    llmConfigManager.checkOllamaAvailability();
    
    console.log(`✅ LLM Router initialized with ${this.providers.size} providers`);
    console.log(llmConfigManager.getConfigSummary());
  }

  /**
   * Select best LLM for a skill
   */
  selectLLMForSkill(
    skill: AgentSkill,
    defaultLLM: LLMConfig,
    overrides?: Record<string, LLMConfig>
  ): LLMConfig {
    // 1. Check if skill has its own preferred LLM
    if (skill.preferred_llm) {
      const providerConfig = llmConfigManager.getProvider(skill.preferred_llm.provider);
      if (providerConfig && providerConfig.isAvailable) {
        console.log(`🎯 Using skill's preferred LLM: ${skill.preferred_llm.provider}`);
        return skill.preferred_llm;
      } else {
        console.log(`⚠️ Skill's preferred LLM ${skill.preferred_llm.provider} not available, finding fallback`);
      }
    }

    // 2. Check for overrides based on skill category
    const skillType = this.categorizeSkill(skill.name);
    if (overrides && overrides[skillType]) {
      const overrideProvider = llmConfigManager.getProvider(overrides[skillType]!.provider);
      if (overrideProvider && overrideProvider.isAvailable) {
        console.log(`🎯 Using override LLM for ${skillType}: ${overrides[skillType]!.provider}`);
        return overrides[skillType]!;
      } else {
        console.log(`⚠️ Override LLM ${overrides[skillType]!.provider} not available, finding fallback`);
      }
    }

    // 3. Get best available provider for this task type
    const bestProvider = llmConfigManager.getBestProviderForTask(skillType);
    if (bestProvider) {
      const recommendedConfig = this.recommendLLM(skillType);
      // Override the provider if we have a better available one
      if (recommendedConfig.provider !== bestProvider.name) {
        recommendedConfig.provider = bestProvider.name;
        console.log(`🎯 Using best available provider for ${skillType}: ${bestProvider.name} (fallback from ${recommendedConfig.provider})`);
      } else {
        console.log(`🎯 Using recommended LLM for ${skillType}: ${bestProvider.name}`);
      }
      return recommendedConfig;
    }

    // 4. Ultimate fallback to default LLM
    console.log(`🔄 Using default LLM as ultimate fallback: ${defaultLLM.provider}/${defaultLLM.model}`);
    return defaultLLM;
  }

  /**
   * Categorize skill to match override keys
   */
  private categorizeSkill(skillName: string): string {
    const lower = skillName.toLowerCase();
    
    // 🚀 Speed-focused tasks
    if (lower.includes('realtime') || lower.includes('streaming') || lower.includes('quick')) return 'realtime';
    if (lower.includes('simple') || lower.includes('basic')) return 'simple_tasks';
    
    // 🧠 Reasoning-focused tasks
    if (lower.includes('research') || lower.includes('analysis') || lower.includes('reasoning')) return 'research';
    if (lower.includes('problem') && lower.includes('solv')) return 'problem_solving';
    
    // ✍️ Creativity-focused tasks
    if (lower.includes('writ') || lower.includes('creative') || lower.includes('story')) return 'writing';
    if (lower.includes('content') && (lower.includes('creat') || lower.includes('generat'))) return 'content_creation';
    if (lower.includes('story') || lower.includes('narrative')) return 'storytelling';
    
    // 💻 Coding-focused tasks
    if (lower.includes('code') || lower.includes('programming') || lower.includes('debug')) return 'code';
    if (lower.includes('review') && lower.includes('code')) return 'code_review';
    if (lower.includes('debug') || lower.includes('fix') || lower.includes('error')) return 'debugging';
    
    // 🌍 Multilingual tasks
    if (lower.includes('translat') || lower.includes('language')) return 'translation';
    if (lower.includes('multilingual') || lower.includes('multi-language')) return 'multilingual';
    
    // 💰 Cost-effective tasks
    if (lower.includes('conversation') || lower.includes('support') || lower.includes('chat')) return 'conversation';
    if (lower.includes('summar') || lower.includes('brief')) return 'summarization';
    
    // 🎯 Specialized tasks
    if (lower.includes('document') || lower.includes('pdf') || lower.includes('text')) return 'document_processing';
    if (lower.includes('email') || lower.includes('mail')) return 'email_processing';
    
    return 'default';
  }

  /**
   * Execute LLM request with automatic provider selection
   */
  async execute(
    messages: LLMMessage[],
    config: LLMConfig,
    fallback?: LLMConfig
  ): Promise<string> {
    try {
      const provider = this.providers.get(config.provider);
      
      if (!provider) {
        throw new Error(`Provider ${config.provider} not available`);
      }

      // Check if provider is available using config manager
      const providerConfig = llmConfigManager.getProvider(config.provider);
      if (!providerConfig || !providerConfig.isAvailable) {
        console.log(`⚠️ ${config.provider} not available, finding fallback`);
        
        // Try fallback provider
        if (providerConfig?.fallbackTo) {
          const fallbackProvider = this.providers.get(providerConfig.fallbackTo);
          const fallbackConfig = llmConfigManager.getProvider(providerConfig.fallbackTo);
          
          if (fallbackProvider && fallbackConfig?.isAvailable) {
            console.log(`🔄 Falling back to ${providerConfig.fallbackTo}`);
            
            // ✅ FIX: Use correct model for fallback provider
            const fallbackModel = providerConfig.fallbackTo === 'openai'
              ? 'gpt-3.5-turbo'  // OpenAI model
              : config.model;     // Keep original model
            
            return await this.execute(messages, { 
              ...config, 
              provider: providerConfig.fallbackTo,
              model: fallbackModel
            });
          }
        }
        
        // Ultimate fallback to OpenAI with CORRECT MODEL
        const openaiProvider = this.providers.get('openai');
        const openaiConfig = llmConfigManager.getProvider('openai');
        
        if (openaiProvider && openaiConfig?.isAvailable) {
          console.log(`🔄 Ultimate fallback to OpenAI`);
          return await openaiProvider.chat(messages, { 
            ...config, 
            provider: 'openai',
            model: 'gpt-3.5-turbo' // ✅ USE OPENAI MODEL!
          });
        }
        
        throw new Error('No available LLM providers found');
      }

      console.log(`🤖 Executing LLM: ${config.provider}/${config.model}`);
      const startTime = Date.now();

      const response = await provider.chat(messages, config);

      const duration = Date.now() - startTime;
      console.log(`✅ LLM responded in ${duration}ms`);

      return response;

    } catch (error) {
      console.error(`❌ LLM execution error with ${config.provider}:`, error);

      // Try intelligent fallback with CORRECT MODEL for fallback provider
      const providerConfig = llmConfigManager.getProvider(config.provider);
      if (providerConfig?.fallbackTo) {
        console.log(`🔄 Provider failed, trying fallback: ${providerConfig.fallbackTo}`);
        
        // ✅ FIX: Use correct model for fallback provider
        const fallbackModel = providerConfig.fallbackTo === 'openai' 
          ? 'gpt-3.5-turbo'  // OpenAI model
          : config.model;     // Keep original model if other provider
        
        return await this.execute(messages, { 
          ...config, 
          provider: providerConfig.fallbackTo,
          model: fallbackModel // ✅ USE CORRECT MODEL!
        });
      }

      // Try fallback if available
      if (fallback) {
        console.log(`🔄 Using provided fallback: ${fallback.provider}/${fallback.model}`);
        return await this.executeFallback(messages, fallback);
      }

      throw error;
    }
  }

  /**
   * Execute with fallback LLM
   */
  private async executeFallback(
    messages: LLMMessage[],
    fallback: LLMConfig
  ): Promise<string> {
    const provider = this.providers.get(fallback.provider);
    
    if (!provider) {
      throw new Error(`Fallback provider ${fallback.provider} not available`);
    }

    return await provider.chat(messages, fallback);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider instance
   */
  getProvider(providerName: LLMProvider): LLMProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Recommend LLM for specific task
   */
  recommendLLM(taskType: string): LLMConfig {
    const recommendations: Record<string, LLMConfig> = {
      // 🚀 SPEED-FOCUSED TASKS
      realtime: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile', // ✅ UPDATED: Oct 2024
        reason: 'Ultra-fast inference for real-time interactions',
        costPerMillion: 0.59
      },
      streaming: {
        provider: 'groq', 
        model: 'llama-3.1-8b-instant', // ✅ UPDATED: Oct 2024
        reason: 'Fastest possible responses for streaming',
        costPerMillion: 0.27
      },
      
      // 🧠 REASONING-FOCUSED TASKS
      research: {
        provider: 'mistral',
        model: 'mistral-large-latest',
        reason: 'Superior reasoning and analytical capabilities',
        costPerMillion: 8.0
      },
      analysis: {
        provider: 'mistral',
        model: 'mistral-large-latest', 
        reason: 'Best for complex data analysis and reasoning',
        costPerMillion: 8.0
      },
      problem_solving: {
        provider: 'mistral',
        model: 'mistral-large-latest',
        reason: 'Excellent for multi-step problem solving',
        costPerMillion: 8.0
      },
      
      // ✍️ CREATIVITY-FOCUSED TASKS
      writing: {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        reason: 'Best for creative and long-form writing',
        costPerMillion: 15.0
      },
      content_creation: {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        reason: 'Great balance of creativity and cost',
        costPerMillion: 3.0
      },
      storytelling: {
        provider: 'anthropic', 
        model: 'claude-3-opus-20240229',
        reason: 'Superior narrative and creative capabilities',
        costPerMillion: 15.0
      },
      
      // 💻 CODING-FOCUSED TASKS
      code: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        reason: 'Best overall coding and debugging capabilities',
        costPerMillion: 10.0
      },
      code_review: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        reason: 'Superior code analysis and review capabilities',
        costPerMillion: 10.0
      },
      debugging: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        reason: 'Best at identifying and fixing code issues',
        costPerMillion: 10.0
      },
      
      // 🌍 MULTILINGUAL TASKS
      translation: {
        provider: 'google',
        model: 'gemini-1.5-pro',
        reason: 'Superior multilingual and translation capabilities',
        costPerMillion: 7.0
      },
      multilingual: {
        provider: 'google',
        model: 'gemini-1.5-pro',
        reason: 'Best support for multiple languages',
        costPerMillion: 7.0
      },
      
      // 💰 COST-EFFECTIVE TASKS
      conversation: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        reason: 'Fast, cheap, reliable for conversations',
        costPerMillion: 0.5
      },
      summarization: {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        reason: 'Fast and accurate summaries at low cost',
        costPerMillion: 0.25
      },
      simple_tasks: {
        provider: 'groq',
        model: 'llama3-8b-8192',
        reason: 'Ultra-fast for simple, repetitive tasks',
        costPerMillion: 0.27
      },
      
      // 🎯 SPECIALIZED TASKS
      document_processing: {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        reason: 'Excellent at understanding and processing documents',
        costPerMillion: 3.0
      },
      email_processing: {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        reason: 'Fast and accurate email analysis',
        costPerMillion: 0.25
      },
      
      // 🔄 FALLBACK
      'default': {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        reason: 'Best all-around model for unknown tasks',
        costPerMillion: 10.0
      }
    };

    return recommendations[taskType] || recommendations['default'];
  }

  /**
   * Estimate cost for request
   */
  estimateCost(
    messageCount: number,
    avgTokensPerMessage: number,
    config: LLMConfig
  ): number {
    const totalTokens = messageCount * avgTokensPerMessage;
    const costPerToken = (config.costPerMillion || 10.0) / 1000000;
    return totalTokens * costPerToken;
  }
}

export const llmRouter = LLMRouter.getInstance();

