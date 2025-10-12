/**
 * LLM Configuration Manager
 * Centralized management of LLM providers with intelligent fallbacks
 */

import { userLLMSettingsService, UserLLMSettings } from './UserLLMSettingsService';

export interface OrganizationLLMSettings {
  organization_id: string;
  openai_api_key?: string;
  groq_api_key?: string;
  mistral_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  ollama_base_url?: string;
  provider_preferences: Record<string, any>;
  monthly_request_quota: number;
  current_requests: number;
  allow_user_keys: boolean;
  fallback_to_org_keys: boolean;
}

export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  isAvailable: boolean;
  priority: number; // Lower number = higher priority
  fallbackTo?: string; // Which provider to fallback to
  source?: 'env' | 'user' | 'organization'; // Where the key came from
}

export interface LLMConfigManagerOptions {
  enableFallbacks: boolean;
  defaultProvider: string;
  logLevel: 'silent' | 'info' | 'debug';
}

export class LLMConfigManager {
  private static instance: LLMConfigManager;
  private providers: Map<string, LLMProviderConfig> = new Map();
  private options: LLMConfigManagerOptions;
  private currentUserId: string | null = null;
  private currentOrganizationId: string | null = null;
  private userSettings: UserLLMSettings | null = null;
  private organizationSettings: OrganizationLLMSettings | null = null;

  private constructor(options?: Partial<LLMConfigManagerOptions>) {
    this.options = {
      enableFallbacks: true,
      defaultProvider: 'openai',
      logLevel: 'info',
      ...options
    };
    
    this.initializeProviders();
  }

  public static getInstance(options?: Partial<LLMConfigManagerOptions>): LLMConfigManager {
    if (!LLMConfigManager.instance) {
      LLMConfigManager.instance = new LLMConfigManager(options);
    }
    return LLMConfigManager.instance;
  }

  /**
   * Initialize all providers with environment variables (fallback)
   */
  private initializeProviders(): void {
    // 🚀 GROQ - Ultra-fast inference
    this.addProvider({
      name: 'groq',
      apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      isAvailable: !!import.meta.env.VITE_GROQ_API_KEY,
      priority: 1, // Highest priority for speed
      fallbackTo: 'openai'
    });

    // 🧠 MISTRAL - Best reasoning
    this.addProvider({
      name: 'mistral',
      apiKey: import.meta.env.VITE_MISTRAL_API_KEY || '',
      baseUrl: 'https://api.mistral.ai/v1',
      isAvailable: !!import.meta.env.VITE_MISTRAL_API_KEY,
      priority: 2,
      fallbackTo: 'openai'
    });

    // ✍️ ANTHROPIC CLAUDE - Best creativity
    this.addProvider({
      name: 'anthropic',
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      isAvailable: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
      priority: 3,
      fallbackTo: 'openai'
    });

    // 🌍 GOOGLE GEMINI - Best multilingual
    this.addProvider({
      name: 'google',
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      isAvailable: !!import.meta.env.VITE_GOOGLE_API_KEY,
      priority: 4,
      fallbackTo: 'openai'
    });

    // 💻 OPENAI - Reliable fallback
    this.addProvider({
      name: 'openai',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      isAvailable: !!import.meta.env.VITE_OPENAI_API_KEY,
      priority: 5, // Lowest priority (fallback)
      fallbackTo: null // No fallback - this is the ultimate fallback
    });

    // 🏠 OLLAMA - Local models (always available if running)
    this.addProvider({
      name: 'ollama',
      apiKey: '', // No API key needed
      baseUrl: 'http://localhost:11434',
      isAvailable: false, // Will be checked dynamically
      priority: 6,
      fallbackTo: 'openai'
    });

    this.log('info', `🔧 LLM Config Manager initialized with ${this.providers.size} providers`);
    this.logAvailableProviders();
  }

  /**
   * Load organization-specific LLM settings
   */
  async loadOrganizationSettings(organizationId: string): Promise<void> {
    try {
      this.currentOrganizationId = organizationId;
      
      // Fetch organization LLM settings from Supabase
      const { getSupabaseClient } = await import('../../lib/supabase');
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('organization_llm_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        this.log('warn', `⚠️ No organization LLM settings found for: ${organizationId}`);
        this.organizationSettings = null;
        return;
      }

      this.organizationSettings = {
        organization_id: data.organization_id,
        openai_api_key: data.openai_api_key,
        groq_api_key: data.groq_api_key,
        mistral_api_key: data.mistral_api_key,
        anthropic_api_key: data.anthropic_api_key,
        google_api_key: data.google_api_key,
        ollama_base_url: data.ollama_base_url,
        provider_preferences: data.provider_preferences || {},
        monthly_request_quota: data.monthly_request_quota || 10000,
        current_requests: data.current_requests || 0,
        allow_user_keys: data.allow_user_keys ?? true,
        fallback_to_org_keys: data.fallback_to_org_keys ?? true
      };

      this.log('info', `🏢 Loaded organization LLM settings: ${organizationId}`);
      
      // Update providers with organization keys
      this.updateProvidersWithOrganizationKeys();
      this.logAvailableProviders();
    } catch (error) {
      this.log('error', `❌ Error loading organization settings: ${error}`);
    }
  }

  /**
   * Load user-specific LLM settings (with organization context)
   */
  async loadUserSettings(userId: string, organizationId?: string): Promise<void> {
    try {
      this.currentUserId = userId;
      
      // Load organization settings first if provided
      if (organizationId) {
        await this.loadOrganizationSettings(organizationId);
      }
      
      this.userSettings = await userLLMSettingsService.getUserSettings(userId);
      
      if (this.userSettings) {
        this.log('info', `👤 Loaded user LLM settings: ${userId}`);
        
        // Determine key priority based on organization policy
        if (this.organizationSettings?.allow_user_keys) {
          // User keys take priority
          this.updateProvidersWithUserKeys();
        } else {
          // Organization keys only
          this.log('info', '🏢 Organization policy: user keys disabled, using org keys only');
        }
        
        // Update task recommendations with user's overrides
        this.updateTaskRecommendations();
        
        this.logAvailableProviders();
      } else {
        this.log('warn', `⚠️ No user LLM settings found for: ${userId}`);
      }
    } catch (error) {
      this.log('error', `❌ Error loading user settings: ${error}`);
    }
  }

  /**
   * Update provider configurations with organization's API keys
   */
  private updateProvidersWithOrganizationKeys(): void {
    if (!this.organizationSettings) return;

    // Update each provider with organization's API key if available
    const keyMappings = {
      openai: this.organizationSettings.openai_api_key,
      groq: this.organizationSettings.groq_api_key,
      mistral: this.organizationSettings.mistral_api_key,
      anthropic: this.organizationSettings.anthropic_api_key,
      google: this.organizationSettings.google_api_key
    };

    for (const [providerName, apiKey] of Object.entries(keyMappings)) {
      const provider = this.providers.get(providerName);
      if (provider && apiKey) {
        provider.apiKey = apiKey;
        provider.isAvailable = true;
        provider.source = 'organization';
        this.log('debug', `🏢 Updated ${providerName} with organization API key`);
      }
    }

    // Update Ollama base URL if provided
    if (this.organizationSettings.ollama_base_url) {
      const ollama = this.providers.get('ollama');
      if (ollama) {
        ollama.baseUrl = this.organizationSettings.ollama_base_url;
      }
    }
  }

  /**
   * Update provider configurations with user's API keys
   */
  private updateProvidersWithUserKeys(): void {
    if (!this.userSettings) return;

    // Update each provider with user's API key if available
    const keyMappings = {
      openai: this.userSettings.openaiApiKey,
      groq: this.userSettings.groqApiKey,
      mistral: this.userSettings.mistralApiKey,
      anthropic: this.userSettings.anthropicApiKey,
      google: this.userSettings.googleApiKey
    };

    for (const [providerName, apiKey] of Object.entries(keyMappings)) {
      const provider = this.providers.get(providerName);
      if (provider && apiKey) {
        provider.apiKey = apiKey;
        provider.isAvailable = true;
        provider.source = 'user';
        this.log('debug', `👤 Updated ${providerName} with user API key`);
      } else if (
        provider &&
        !apiKey &&
        this.organizationSettings?.fallback_to_org_keys &&
        provider.source === 'organization'
      ) {
        // Keep organization key as fallback
        this.log('debug', `🔄 ${providerName} falling back to organization key`);
      }
    }
  }

  /**
   * Update task recommendations with user's overrides
   */
  private updateTaskRecommendations(): void {
    if (!this.userSettings) return;

    // This will be used by the LLMRouter to override default recommendations
    this.log('debug', `🎯 User has ${Object.keys(this.userSettings.taskOverrides).length} task overrides`);
  }

  /**
   * Clear user settings (for logout or org switch)
   */
  clearUserSettings(): void {
    this.currentUserId = null;
    this.userSettings = null;
    
    // Keep organization settings if still active
    if (this.organizationSettings) {
      this.log('info', '👤 Cleared user settings, keeping organization settings');
      this.updateProvidersWithOrganizationKeys();
    } else {
      // Reset providers to environment variable defaults
      this.initializeProviders();
      this.log('info', '👤 Cleared all user LLM settings');
    }
  }

  /**
   * Clear organization settings (for org switch)
   */
  clearOrganizationSettings(): void {
    this.currentOrganizationId = null;
    this.organizationSettings = null;
    
    // Reset providers to environment variable defaults
    this.initializeProviders();
    
    // Re-apply user settings if they exist
    if (this.userSettings) {
      this.updateProvidersWithUserKeys();
    }
    
    this.log('info', '🏢 Cleared organization LLM settings');
  }

  /**
   * Clear all settings (complete logout)
   */
  clearAllSettings(): void {
    this.currentUserId = null;
    this.currentOrganizationId = null;
    this.userSettings = null;
    this.organizationSettings = null;
    
    // Reset providers to environment variable defaults
    this.initializeProviders();
    
    this.log('info', '🔄 Cleared all LLM settings');
  }

  /**
   * Add a provider configuration
   */
  private addProvider(config: LLMProviderConfig): void {
    this.providers.set(config.name, config);
  }

  /**
   * Get provider configuration
   */
  public getProvider(name: string): LLMProviderConfig | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers
   */
  public getAvailableProviders(): LLMProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isAvailable)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the best available provider for a task type
   */
  public getBestProviderForTask(taskType: string): LLMProviderConfig | null {
    // If user settings are loaded, use them
    if (this.userSettings) {
      return this.getBestProviderForTaskWithUserSettings(taskType);
    }

    // Fallback to environment-based recommendations
    const recommendations = this.getTaskRecommendations();
    const recommendedProvider = recommendations[taskType];
    
    if (!recommendedProvider) {
      return this.getDefaultProvider();
    }

    // Check if recommended provider is available
    const provider = this.getProvider(recommendedProvider);
    if (provider && provider.isAvailable) {
      this.log('debug', `🎯 Using recommended provider for ${taskType}: ${provider.name}`);
      return provider;
    }

    // Fallback to next best option
    if (this.options.enableFallbacks && provider?.fallbackTo) {
      const fallbackProvider = this.getProvider(provider.fallbackTo);
      if (fallbackProvider && fallbackProvider.isAvailable) {
        this.log('info', `⚠️ Recommended provider ${recommendedProvider} not available, using fallback: ${fallbackProvider.name}`);
        return fallbackProvider;
      }
    }

    // Ultimate fallback to default
    return this.getDefaultProvider();
  }

  /**
   * Get the best available provider for a task type using user settings
   */
  private getBestProviderForTaskWithUserSettings(taskType: string): LLMProviderConfig | null {
    if (!this.userSettings) return this.getDefaultProvider();

    // Check user's task overrides first
    if (this.userSettings.taskOverrides[taskType]) {
      const override = this.userSettings.taskOverrides[taskType];
      const provider = this.getProvider(override.provider);
      
      if (provider && provider.isAvailable) {
        this.log('debug', `🎯 Using user task override for ${taskType}: ${override.provider}`);
        return provider;
      } else {
        this.log('info', `⚠️ User's task override ${override.provider} not available, finding fallback`);
      }
    }

    // Check user's provider preferences
    const availableProviders = this.getAvailableProviders();
    const enabledProviders = availableProviders.filter(provider => {
      const preference = this.userSettings!.providerPreferences[provider.name];
      return preference?.enabled !== false;
    });

    if (enabledProviders.length === 0) {
      return this.getDefaultProvider();
    }

    // Sort by user's priority preferences
    const sortedProviders = enabledProviders.sort((a, b) => {
      const priorityA = this.userSettings!.providerPreferences[a.name]?.priority || 999;
      const priorityB = this.userSettings!.providerPreferences[b.name]?.priority || 999;
      return priorityA - priorityB;
    });

    const bestProvider = sortedProviders[0];
    this.log('debug', `🎯 Using user's preferred provider for ${taskType}: ${bestProvider.name}`);
    return bestProvider;
  }

  /**
   * Get default provider (always OpenAI if available)
   */
  public getDefaultProvider(): LLMProviderConfig | null {
    const openai = this.getProvider('openai');
    if (openai && openai.isAvailable) {
      this.log('debug', '🔄 Using default provider: openai');
      return openai;
    }

    // If OpenAI is not available, get any available provider
    const available = this.getAvailableProviders();
    if (available.length > 0) {
      this.log('warn', `⚠️ OpenAI not available, using first available: ${available[0].name}`);
      return available[0];
    }

    this.log('error', '❌ No LLM providers available!');
    return null;
  }

  /**
   * Task-specific provider recommendations
   */
  private getTaskRecommendations(): Record<string, string> {
    return {
      // 🚀 Speed-focused tasks
      realtime: 'groq',
      streaming: 'groq',
      simple_tasks: 'groq',
      
      // 🧠 Reasoning-focused tasks
      research: 'mistral',
      analysis: 'mistral',
      problem_solving: 'mistral',
      
      // ✍️ Creativity-focused tasks
      writing: 'anthropic',
      content_creation: 'anthropic',
      storytelling: 'anthropic',
      
      // 💻 Coding-focused tasks
      code: 'openai',
      code_review: 'openai',
      debugging: 'openai',
      
      // 🌍 Multilingual tasks
      translation: 'google',
      multilingual: 'google',
      
      // 💰 Cost-effective tasks
      conversation: 'openai',
      summarization: 'anthropic',
      
      // 🎯 Specialized tasks
      document_processing: 'anthropic',
      email_processing: 'anthropic',
      
      // 🏠 Local tasks
      local: 'ollama',
      
      // Default
      default: 'openai'
    };
  }

  /**
   * Check if Ollama is running locally
   */
  public async checkOllamaAvailability(): Promise<boolean> {
    const ollamaProvider = this.getProvider('ollama');
    if (!ollamaProvider) return false;

    try {
      const response = await fetch(`${ollamaProvider.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      const isAvailable = response.ok;
      ollamaProvider.isAvailable = isAvailable;
      
      if (isAvailable) {
        this.log('info', '🏠 Ollama is available locally');
      }
      
      return isAvailable;
    } catch (error) {
      ollamaProvider.isAvailable = false;
      return false;
    }
  }

  /**
   * Update provider availability status
   */
  public updateProviderAvailability(name: string, isAvailable: boolean): void {
    const provider = this.getProvider(name);
    if (provider) {
      provider.isAvailable = isAvailable;
      this.log('debug', `📊 Updated ${name} availability: ${isAvailable}`);
    }
  }

  /**
   * Get provider statistics
   */
  public getProviderStats(): {
    total: number;
    available: number;
    unavailable: string[];
    availableList: string[];
  } {
    const all = Array.from(this.providers.values());
    const available = all.filter(p => p.isAvailable);
    const unavailable = all.filter(p => !p.isAvailable).map(p => p.name);
    
    return {
      total: all.length,
      available: available.length,
      unavailable,
      availableList: available.map(p => p.name)
    };
  }

  /**
   * Log provider availability
   */
  private logAvailableProviders(): void {
    const stats = this.getProviderStats();
    
    this.log('info', `📊 Provider Status: ${stats.available}/${stats.total} available`);
    
    if (stats.availableList.length > 0) {
      this.log('info', `✅ Available: ${stats.availableList.join(', ')}`);
    }
    
    if (stats.unavailable.length > 0) {
      this.log('info', `⚠️ Unavailable: ${stats.unavailable.join(', ')}`);
    }
  }

  /**
   * Logging utility
   */
  private log(level: string, message: string): void {
    if (this.options.logLevel === 'silent') return;
    if (this.options.logLevel === 'info' && level === 'debug') return;
    
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '🐛';
    console.log(`${emoji} [LLMConfigManager] ${message}`);
  }

  /**
   * Get organization quota information
   */
  public getOrganizationQuota(): {
    hasQuota: boolean;
    monthlyLimit: number;
    currentUsage: number;
    remaining: number;
    percentageUsed: number;
  } | null {
    if (!this.organizationSettings) {
      return null;
    }

    const monthlyLimit = this.organizationSettings.monthly_request_quota;
    const currentUsage = this.organizationSettings.current_requests;
    const remaining = Math.max(0, monthlyLimit - currentUsage);
    const percentageUsed = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0;

    return {
      hasQuota: true,
      monthlyLimit,
      currentUsage,
      remaining,
      percentageUsed
    };
  }

  /**
   * Check if organization has reached quota
   */
  public hasReachedQuota(): boolean {
    const quota = this.getOrganizationQuota();
    if (!quota) return false;
    return quota.remaining <= 0;
  }

  /**
   * Get current organization ID
   */
  public getCurrentOrganizationId(): string | null {
    return this.currentOrganizationId;
  }

  /**
   * Get current user ID
   */
  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get organization policy on user keys
   */
  public getAllowUserKeys(): boolean {
    return this.organizationSettings?.allow_user_keys ?? true;
  }

  /**
   * Increment organization usage counter
   */
  public async incrementUsage(requests: number = 1): Promise<void> {
    if (!this.currentOrganizationId) return;

    try {
      const { getSupabaseClient } = await import('../../lib/supabase');
      const supabase = getSupabaseClient();

      await supabase
        .from('organization_llm_settings')
        .update({
          current_requests: this.organizationSettings!.current_requests + requests,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', this.currentOrganizationId);

      // Update local cache
      if (this.organizationSettings) {
        this.organizationSettings.current_requests += requests;
      }
    } catch (error) {
      this.log('error', `❌ Failed to increment usage: ${error}`);
    }
  }

  /**
   * Get configuration summary for debugging
   */
  public getConfigSummary(): string {
    const stats = this.getProviderStats();
    const available = stats.availableList.join(', ');
    const unavailable = stats.unavailable.join(', ');
    const quota = this.getOrganizationQuota();
    
    let summary = `
🔧 LLM Configuration Summary:
├─ Total Providers: ${stats.total}
├─ Available: ${stats.available} (${available})
├─ Unavailable: ${stats.unavailable.length} (${unavailable})
├─ Default Provider: ${this.options.defaultProvider}
├─ Fallbacks Enabled: ${this.options.enableFallbacks}
├─ Log Level: ${this.options.logLevel}`;

    if (this.currentUserId) {
      summary += `\n├─ User ID: ${this.currentUserId}`;
    }

    if (this.currentOrganizationId) {
      summary += `\n├─ Organization ID: ${this.currentOrganizationId}`;
    }

    if (quota) {
      summary += `\n├─ Organization Quota: ${quota.currentUsage}/${quota.monthlyLimit} (${quota.percentageUsed.toFixed(1)}%)`;
    }

    if (this.organizationSettings) {
      summary += `\n├─ Allow User Keys: ${this.organizationSettings.allow_user_keys}`;
      summary += `\n├─ Fallback to Org Keys: ${this.organizationSettings.fallback_to_org_keys}`;
    }

    return summary.trim();
  }
}

// Export singleton instance
export const llmConfigManager = LLMConfigManager.getInstance();
