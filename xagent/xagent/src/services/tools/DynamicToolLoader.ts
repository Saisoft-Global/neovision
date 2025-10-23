/**
 * Dynamic Tool Loader
 * Allows users to register tools and skills via JSON configuration
 * No coding required!
 */

import type { Tool, ToolSkill, ToolExecutionContext, ToolExecutionResult } from './types';

export interface DynamicToolConfig {
  id: string;
  name: string;
  description: string;
  category: 'integration' | 'communication' | 'data' | 'automation' | 'custom';
  provider: string;
  version: string;
  isActive: boolean;
  requiresAuth: boolean;
  
  // Authentication configuration
  auth?: {
    type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
    credentials: {
      [key: string]: string; // e.g., { "api_key": "{{ENV_VAR}}", "base_url": "https://api..." }
    };
  };
  
  // Skills configuration
  skills: DynamicSkillConfig[];
}

export interface DynamicSkillConfig {
  id: string;
  name: string;
  description: string;
  
  // HTTP Request configuration
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string; // Can use variables: {{base_url}}/invoices
    headers?: {
      [key: string]: string; // Can use variables: "Authorization": "Bearer {{api_key}}"
    };
    body?: {
      type: 'json' | 'form' | 'text';
      template?: string; // JSON template with variables
    };
  };
  
  // Input parameters from user/agent
  parameters: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required: boolean;
      description: string;
      default?: any;
    };
  };
  
  // Response transformation
  response?: {
    extractPath?: string; // JSON path to extract: "data.invoices"
    transform?: {
      [outputKey: string]: string; // Map response fields: "invoice_id": "id"
    };
    successMessage?: string; // Template: "Created invoice {{invoice_number}}"
  };
  
  // Error handling
  errorHandling?: {
    retryCount?: number;
    retryDelay?: number;
    fallbackMessage?: string;
    useBrowserFallback?: boolean;  // NEW: Enable browser automation fallback
    browserFallbackConfig?: {
      searchQuery?: string;  // Template for Google search
      websiteUrl?: string;   // Direct URL if known
      instructions?: string; // Steps for browser automation
    };
  };
}

/**
 * Dynamic Tool Class
 * Executes API calls based on JSON configuration
 */
export class DynamicTool implements Tool {
  id: string;
  name: string;
  description: string;
  category: 'integration' | 'communication' | 'data' | 'automation' | 'custom';
  provider: string;
  version: string;
  isActive: boolean;
  requiresAuth: boolean;
  skills: ToolSkill[];
  
  private config: DynamicToolConfig;
  private credentials: Record<string, string> = {};

  constructor(config: DynamicToolConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.provider = config.provider;
    this.version = config.version;
    this.isActive = config.isActive;
    this.requiresAuth = config.requiresAuth;
    
    // Initialize credentials from environment variables
    if (config.auth) {
      this.credentials = this.loadCredentials(config.auth.credentials);
    }
    
    // Convert skill configs to executable skills
    this.skills = config.skills.map(skillConfig => this.createSkill(skillConfig));
  }

  /**
   * Load credentials from environment variables
   */
  private loadCredentials(credentialConfig: Record<string, string>): Record<string, string> {
    const credentials: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(credentialConfig)) {
      // Replace {{ENV_VAR}} with actual environment variable
      if (value.startsWith('{{') && value.endsWith('}}')) {
        const envVar = value.slice(2, -2);
        credentials[key] = import.meta.env[envVar] || value;
      } else {
        credentials[key] = value;
      }
    }
    
    return credentials;
  }

  /**
   * Replace variables in string with actual values
   */
  private replaceVariables(
    template: string,
    context: {
      credentials: Record<string, string>;
      parameters: Record<string, any>;
      response?: any;
    }
  ): string {
    let result = template;
    
    // Replace credential variables: {{api_key}}
    for (const [key, value] of Object.entries(context.credentials)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    // Replace parameter variables: {{customer_name}}
    for (const [key, value] of Object.entries(context.parameters)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Replace response variables if available: {{response.id}}
    if (context.response) {
      const responseStr = JSON.stringify(context.response);
      result = result.replace(/{{response\.([^}]+)}}/g, (match, path) => {
        return this.getValueByPath(context.response, path) || match;
      });
    }
    
    return result;
  }

  /**
   * Get value from object by path (e.g., "data.invoice.id")
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create executable skill from configuration
   */
  private createSkill(skillConfig: DynamicSkillConfig): ToolSkill {
    return {
      id: skillConfig.id,
      name: skillConfig.name,
      description: skillConfig.description,
      parameters: skillConfig.parameters,
      execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
        return this.executeSkill(skillConfig, context);
      },
    };
  }

  /**
   * Execute a skill by making API call
   */
  private async executeSkill(
    skillConfig: DynamicSkillConfig,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // 1. Build URL
      const url = this.replaceVariables(skillConfig.request.url, {
        credentials: this.credentials,
        parameters: context.parameters,
      });

      // 2. Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (skillConfig.request.headers) {
        for (const [key, value] of Object.entries(skillConfig.request.headers)) {
          headers[key] = this.replaceVariables(value, {
            credentials: this.credentials,
            parameters: context.parameters,
          });
        }
      }

      // 3. Build request body
      let body: any = undefined;
      if (skillConfig.request.body && ['POST', 'PUT', 'PATCH'].includes(skillConfig.request.method)) {
        if (skillConfig.request.body.template) {
          const bodyTemplate = this.replaceVariables(skillConfig.request.body.template, {
            credentials: this.credentials,
            parameters: context.parameters,
          });
          body = JSON.parse(bodyTemplate);
        } else {
          body = context.parameters;
        }
      }

      // 4. Make API call
      console.log(`🔧 [${this.name}] Executing skill: ${skillConfig.name}`);
      console.log(`   URL: ${url}`);
      console.log(`   Method: ${skillConfig.request.method}`);
      
      const response = await fetch(url, {
        method: skillConfig.request.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // 5. Handle response
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      // 6. Transform response
      let result = responseData;
      if (skillConfig.response?.extractPath) {
        result = this.getValueByPath(responseData, skillConfig.response.extractPath);
      }

      if (skillConfig.response?.transform) {
        const transformed: Record<string, any> = {};
        for (const [outputKey, sourcePath] of Object.entries(skillConfig.response.transform)) {
          transformed[outputKey] = this.getValueByPath(responseData, sourcePath);
        }
        result = transformed;
      }

      // 7. Generate success message
      let message = skillConfig.response?.successMessage || `${skillConfig.name} executed successfully`;
      message = this.replaceVariables(message, {
        credentials: this.credentials,
        parameters: context.parameters,
        response: result,
      });

      return {
        success: true,
        data: result,
        message,
      };

    } catch (error) {
      console.error(`❌ [${this.name}] Skill execution failed:`, error);
      
      // 🌐 CHECK FOR BROWSER FALLBACK
      if (skillConfig.errorHandling?.useBrowserFallback) {
        console.log(`🌐 API failed, activating browser fallback for ${skillConfig.name}...`);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'API call failed',
          metadata: {
            shouldFallbackToBrowser: true,
            browserFallbackConfig: skillConfig.errorHandling.browserFallbackConfig,
            originalSkillName: skillConfig.name,
            originalParameters: context.parameters
          }
        };
      }
      
      const errorMessage = skillConfig.errorHandling?.fallbackMessage || 
                          `Failed to execute ${skillConfig.name}: ${error}`;
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async execute(skillName: string, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const skill = this.skills.find(s => s.name === skillName);
    if (!skill) {
      return {
        success: false,
        error: `Skill '${skillName}' not found in ${this.name}`,
      };
    }

    return skill.execute(context);
  }

  async validateAuth(credentials: Record<string, any>): Promise<boolean> {
    // TODO: Implement validation if needed
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Test with first skill if available
      if (this.skills.length > 0) {
        return {
          success: true,
          message: `${this.name} configured with ${this.skills.length} skill(s)`,
        };
      }
      return {
        success: true,
        message: `${this.name} loaded successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize ${this.name}: ${error}`,
      };
    }
  }
}

/**
 * Dynamic Tool Loader Service
 * Loads tools from JSON files or database
 */
export class DynamicToolLoaderService {
  private static instance: DynamicToolLoaderService;
  private loadedTools: Map<string, DynamicTool> = new Map();

  private constructor() {}

  public static getInstance(): DynamicToolLoaderService {
    if (!this.instance) {
      this.instance = new DynamicToolLoaderService();
    }
    return this.instance;
  }

  /**
   * Load tool from JSON configuration
   */
  async loadToolFromJSON(config: DynamicToolConfig): Promise<DynamicTool> {
    try {
      console.log(`📦 Loading dynamic tool: ${config.name}`);
      
      // Validate configuration
      this.validateToolConfig(config);
      
      // Create dynamic tool
      const tool = new DynamicTool(config);
      
      // Store tool
      this.loadedTools.set(tool.id, tool);
      
      console.log(`✅ Loaded tool: ${config.name} with ${config.skills.length} skill(s)`);
      
      return tool;
    } catch (error) {
      console.error(`❌ Failed to load tool: ${config.name}`, error);
      throw error;
    }
  }

  /**
   * Load tool from file
   */
  async loadToolFromFile(filePath: string): Promise<DynamicTool> {
    try {
      const response = await fetch(filePath);
      const config: DynamicToolConfig = await response.json();
      return this.loadToolFromJSON(config);
    } catch (error) {
      console.error(`❌ Failed to load tool from file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Load tool from database (Supabase)
   */
  async loadToolFromDatabase(toolId: string, supabaseClient: any): Promise<DynamicTool> {
    try {
      const { data, error } = await supabaseClient
        .from('tools')
        .select('*')
        .eq('id', toolId)
        .single();

      if (error) throw error;
      
      // Use 'config' column (JSONB in Supabase auto-parses)
      const config: DynamicToolConfig = typeof data.config === 'string'
        ? JSON.parse(data.config)
        : data.config;
      return this.loadToolFromJSON(config);
    } catch (error) {
      console.error(`❌ Failed to load tool from database: ${toolId}`, error);
      throw error;
    }
  }

  /**
   * Validate tool configuration
   */
  private validateToolConfig(config: DynamicToolConfig): void {
    if (!config.id || !config.name) {
      throw new Error('Tool must have id and name');
    }
    
    if (!config.skills || config.skills.length === 0) {
      throw new Error('Tool must have at least one skill');
    }
    
    for (const skill of config.skills) {
      // ✅ FLEXIBLE: Accept either format
      // Format 1: (id, name, request) - Original format
      // Format 2: (id, name, endpoint) - Banking/API format  
      const hasId = !!skill.id;
      const hasName = !!skill.name;
      const hasExecutor = !!(skill.request || skill.endpoint || skill.handler);
      
      if (!hasId || !hasName || !hasExecutor) {
        throw new Error(
          `Invalid skill configuration: ${skill.name || skill.id || 'unnamed'} - ` +
          `must have id, name, and (request OR endpoint OR handler)`
        );
      }
    }
  }

  /**
   * Get loaded tool by ID
   */
  getTool(toolId: string): DynamicTool | undefined {
    return this.loadedTools.get(toolId);
  }

  /**
   * Get all loaded tools
   */
  getAllTools(): DynamicTool[] {
    return Array.from(this.loadedTools.values());
  }

  /**
   * Unload tool
   */
  unloadTool(toolId: string): boolean {
    return this.loadedTools.delete(toolId);
  }
}


