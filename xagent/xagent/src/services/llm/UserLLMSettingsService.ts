/**
 * User LLM Settings Service
 * Manages user-specific LLM API keys and preferences stored in database
 */

import { getSupabaseClient } from '../../config/supabase/client';

export interface UserLLMSettings {
  id: string;
  userId: string;
  
  // API Keys (encrypted in production)
  openaiApiKey?: string;
  groqApiKey?: string;
  mistralApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  
  // Preferences
  defaultProvider: string;
  enableFallbacks: boolean;
  
  // Provider preferences
  providerPreferences: {
    [provider: string]: {
      enabled: boolean;
      priority: number;
    };
  };
  
  // Task-specific overrides
  taskOverrides: {
    [taskType: string]: {
      provider: string;
      model: string;
    };
  };
  
  // Usage tracking
  totalRequests: number;
  lastUsedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserLLMSettingsInput {
  userId: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  mistralApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  defaultProvider?: string;
  enableFallbacks?: boolean;
  providerPreferences?: any;
  taskOverrides?: any;
}

export class UserLLMSettingsService {
  private static instance: UserLLMSettingsService;
  private supabase = getSupabaseClient();
  private settingsCache = new Map<string, UserLLMSettings>();

  private constructor() {}

  public static getInstance(): UserLLMSettingsService {
    if (!UserLLMSettingsService.instance) {
      UserLLMSettingsService.instance = new UserLLMSettingsService();
    }
    return UserLLMSettingsService.instance;
  }

  /**
   * Get user LLM settings (with caching)
   */
  async getUserSettings(userId: string): Promise<UserLLMSettings | null> {
    // Check cache first
    if (this.settingsCache.has(userId)) {
      console.log(`📋 Using cached LLM settings for user: ${userId}`);
      return this.settingsCache.get(userId)!;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_llm_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default ones
          console.log(`📋 No LLM settings found for user ${userId}, creating defaults`);
          return await this.createDefaultSettings(userId);
        }
        throw error;
      }

      const settings: UserLLMSettings = {
        id: data.id,
        userId: data.user_id,
        openaiApiKey: data.openai_api_key,
        groqApiKey: data.groq_api_key,
        mistralApiKey: data.mistral_api_key,
        anthropicApiKey: data.anthropic_api_key,
        googleApiKey: data.google_api_key,
        defaultProvider: data.default_provider,
        enableFallbacks: data.enable_fallbacks,
        providerPreferences: data.provider_preferences || {},
        taskOverrides: data.task_overrides || {},
        totalRequests: data.total_requests || 0,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Cache the settings
      this.settingsCache.set(userId, settings);
      
      console.log(`📋 Loaded LLM settings for user: ${userId}`);
      return settings;

    } catch (error) {
      console.error(`❌ Error loading LLM settings for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Create default LLM settings for a user
   */
  async createDefaultSettings(userId: string): Promise<UserLLMSettings> {
    const defaultSettings: CreateUserLLMSettingsInput = {
      userId,
      defaultProvider: 'openai',
      enableFallbacks: true,
      providerPreferences: {
        openai: { enabled: true, priority: 5 },
        groq: { enabled: true, priority: 1 },
        mistral: { enabled: true, priority: 2 },
        anthropic: { enabled: true, priority: 3 },
        google: { enabled: true, priority: 4 }
      },
      taskOverrides: {
        research: { provider: 'mistral', model: 'mistral-large-latest' },
        writing: { provider: 'anthropic', model: 'claude-3-opus-20240229' },
        coding: { provider: 'openai', model: 'gpt-4-turbo-preview' },
        conversation: { provider: 'groq', model: 'llama3-8b-8192' },
        translation: { provider: 'google', model: 'gemini-1.5-pro' }
      }
    };

    try {
      const { data, error } = await this.supabase
        .from('user_llm_settings')
        .insert([{
          user_id: userId,
          default_provider: defaultSettings.defaultProvider,
          enable_fallbacks: defaultSettings.enableFallbacks,
          provider_preferences: defaultSettings.providerPreferences,
          task_overrides: defaultSettings.taskOverrides
        }])
        .select()
        .single();

      if (error) throw error;

      const settings: UserLLMSettings = {
        id: data.id,
        userId: data.user_id,
        openaiApiKey: data.openai_api_key,
        groqApiKey: data.groq_api_key,
        mistralApiKey: data.mistral_api_key,
        anthropicApiKey: data.anthropic_api_key,
        googleApiKey: data.google_api_key,
        defaultProvider: data.default_provider,
        enableFallbacks: data.enable_fallbacks,
        providerPreferences: data.provider_preferences,
        taskOverrides: data.task_overrides,
        totalRequests: data.total_requests,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Cache the settings
      this.settingsCache.set(userId, settings);
      
      console.log(`✅ Created default LLM settings for user: ${userId}`);
      return settings;

    } catch (error) {
      console.error(`❌ Error creating default LLM settings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user LLM settings
   */
  async updateUserSettings(userId: string, updates: Partial<CreateUserLLMSettingsInput>): Promise<UserLLMSettings> {
    try {
      const updateData: any = {};
      
      if (updates.openaiApiKey !== undefined) updateData.openai_api_key = updates.openaiApiKey;
      if (updates.groqApiKey !== undefined) updateData.groq_api_key = updates.groqApiKey;
      if (updates.mistralApiKey !== undefined) updateData.mistral_api_key = updates.mistralApiKey;
      if (updates.anthropicApiKey !== undefined) updateData.anthropic_api_key = updates.anthropicApiKey;
      if (updates.googleApiKey !== undefined) updateData.google_api_key = updates.googleApiKey;
      if (updates.defaultProvider !== undefined) updateData.default_provider = updates.defaultProvider;
      if (updates.enableFallbacks !== undefined) updateData.enable_fallbacks = updates.enableFallbacks;
      if (updates.providerPreferences !== undefined) updateData.provider_preferences = updates.providerPreferences;
      if (updates.taskOverrides !== undefined) updateData.task_overrides = updates.taskOverrides;

      const { data, error } = await this.supabase
        .from('user_llm_settings')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const settings: UserLLMSettings = {
        id: data.id,
        userId: data.user_id,
        openaiApiKey: data.openai_api_key,
        groqApiKey: data.groq_api_key,
        mistralApiKey: data.mistral_api_key,
        anthropicApiKey: data.anthropic_api_key,
        googleApiKey: data.google_api_key,
        defaultProvider: data.default_provider,
        enableFallbacks: data.enable_fallbacks,
        providerPreferences: data.provider_preferences,
        taskOverrides: data.task_overrides,
        totalRequests: data.total_requests,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Update cache
      this.settingsCache.set(userId, settings);
      
      console.log(`✅ Updated LLM settings for user: ${userId}`);
      return settings;

    } catch (error) {
      console.error(`❌ Error updating LLM settings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Track LLM usage for a user
   */
  async trackUsage(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('track_llm_usage', {
        user_uuid: userId
      });

      if (error) throw error;

      // Update cache if exists
      const cached = this.settingsCache.get(userId);
      if (cached) {
        cached.totalRequests += 1;
        cached.lastUsedAt = new Date().toISOString();
        this.settingsCache.set(userId, cached);
      }

    } catch (error) {
      console.error(`❌ Error tracking LLM usage for user ${userId}:`, error);
      // Don't throw - usage tracking shouldn't break the main flow
    }
  }

  /**
   * Get available providers for a user
   */
  async getAvailableProviders(userId: string): Promise<string[]> {
    const settings = await this.getUserSettings(userId);
    if (!settings) return ['openai']; // Fallback

    const available: string[] = [];
    
    if (settings.openaiApiKey) available.push('openai');
    if (settings.groqApiKey) available.push('groq');
    if (settings.mistralApiKey) available.push('mistral');
    if (settings.anthropicApiKey) available.push('anthropic');
    if (settings.googleApiKey) available.push('google');
    
    // Always include Ollama (local) and OpenAI (fallback)
    if (!available.includes('openai')) available.push('openai');
    available.push('ollama');
    
    return available;
  }

  /**
   * Get best provider for a specific task
   */
  async getBestProviderForTask(userId: string, taskType: string): Promise<string> {
    const settings = await this.getUserSettings(userId);
    if (!settings) return 'openai';

    // Check task overrides first
    if (settings.taskOverrides[taskType]) {
      const override = settings.taskOverrides[taskType];
      const availableProviders = await this.getAvailableProviders(userId);
      
      if (availableProviders.includes(override.provider)) {
        console.log(`🎯 Using task override for ${taskType}: ${override.provider}`);
        return override.provider;
      }
    }

    // Check provider preferences
    const availableProviders = await this.getAvailableProviders(userId);
    const enabledProviders = availableProviders.filter(provider => 
      settings.providerPreferences[provider]?.enabled !== false
    );

    if (enabledProviders.length === 0) {
      return settings.defaultProvider || 'openai';
    }

    // Sort by priority (lower number = higher priority)
    const sortedProviders = enabledProviders.sort((a, b) => {
      const priorityA = settings.providerPreferences[a]?.priority || 999;
      const priorityB = settings.providerPreferences[b]?.priority || 999;
      return priorityA - priorityB;
    });

    const bestProvider = sortedProviders[0];
    console.log(`🎯 Using best available provider for ${taskType}: ${bestProvider}`);
    return bestProvider;
  }

  /**
   * Clear cache for a user (useful after updates)
   */
  clearUserCache(userId: string): void {
    this.settingsCache.delete(userId);
    console.log(`🗑️ Cleared LLM settings cache for user: ${userId}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.settingsCache.clear();
    console.log(`🗑️ Cleared all LLM settings cache`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; users: string[] } {
    return {
      size: this.settingsCache.size,
      users: Array.from(this.settingsCache.keys())
    };
  }
}

// Export singleton instance
export const userLLMSettingsService = UserLLMSettingsService.getInstance();


