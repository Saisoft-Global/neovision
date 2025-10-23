/**
 * Product-Level Tool Registry Service
 * Registers tools globally at the product level (not organization-specific)
 * 
 * Architecture:
 * TIER 1 (Product): Tools registered here → Available to all orgs
 * TIER 2 (Organization): Orgs enable tools they want → OrganizationToolService
 * TIER 3 (Agent): Agents attach enabled tools → ToolEnabledAgent
 */

import { getSupabaseClient } from '../../config/supabase';
import { ToolRegistry, toolRegistry } from './ToolRegistry';
import type { Tool } from '../../types/tool-framework';

export interface ProductToolRegistration {
  tool: Tool;
  isSystemTool: boolean;  // Built-in vs custom
  isPublic: boolean;      // Available to all orgs vs specific orgs
}

export class ProductToolRegistry {
  private static instance: ProductToolRegistry;
  private supabase = getSupabaseClient();
  private localRegistry: ToolRegistry;

  private constructor() {
    this.localRegistry = toolRegistry;
  }

  public static getInstance(): ProductToolRegistry {
    if (!this.instance) {
      this.instance = new ProductToolRegistry();
    }
    return this.instance;
  }

  /**
   * Register a tool at product level (available to all organizations)
   * This is called during application initialization for built-in tools
   */
  async registerProductTool(registration: ProductToolRegistration): Promise<void> {
    const { tool, isSystemTool, isPublic } = registration;

    try {
      console.log(`📦 Registering product-level tool: ${tool.name}`);

      // 1. Register in local memory registry (for runtime use)
      this.localRegistry.registerTool(tool);

      // 2. Store in database as product-level tool
      const { error: toolError } = await this.supabase
        .from('tools')
        .upsert({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          type: tool.category || tool.type || 'custom',
          config: {
            provider: tool.provider,
            version: tool.version,
            requiresAuth: tool.requiresAuth
          },
          is_active: tool.isActive,
          is_system_tool: isSystemTool,
          is_public: isPublic,
          organization_id: null,  // ✅ NULL = Product-level tool
          visibility: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (toolError) {
        console.error('Error storing product tool:', toolError);
        throw toolError;
      }

      // 3. Store tool skills
      if (tool.skills && tool.skills.length > 0) {
        const skillRecords = tool.skills.map(skill => ({
          tool_id: tool.id,
          skill_name: skill.name,
          description: skill.description,
          parameters: skill.parameters,
          required_permissions: skill.requiredPermissions || [],
          is_active: true
        }));

        const { error: skillsError } = await this.supabase
          .from('tool_skills')
          .upsert(skillRecords, {
            onConflict: 'tool_id,skill_name'
          });

        if (skillsError) {
          console.error('Error storing tool skills:', skillsError);
          // Don't throw - tool is registered even if skills fail
        }
      }

      console.log(`✅ Product tool registered: ${tool.name} (${tool.skills.length} skills)`);
    } catch (error) {
      console.error('Failed to register product tool:', error);
      throw error;
    }
  }

  /**
   * Register multiple tools at once (bulk registration)
   */
  async registerProductTools(registrations: ProductToolRegistration[]): Promise<void> {
    console.log(`📦 Registering ${registrations.length} product-level tools...`);
    
    for (const registration of registrations) {
      try {
        await this.registerProductTool(registration);
      } catch (error) {
        console.error(`Failed to register tool ${registration.tool.name}:`, error);
        // Continue with other tools
      }
    }

    console.log(`✅ Product tool registration complete`);
  }

  /**
   * Get all product-level tools from database
   */
  async getProductTools(): Promise<Tool[]> {
    const { data, error } = await this.supabase
      .from('tools')
      .select('*')
      .is('organization_id', null)  // Product-level tools only
      .eq('is_active', true)
      .eq('is_public', true);

    if (error) {
      console.error('Error fetching product tools:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Sync local registry with database (load product tools on app startup)
   */
  async syncWithDatabase(): Promise<void> {
    try {
      console.log('🔄 Syncing local tool registry with database...');

      const productTools = await this.getProductTools();

      for (const toolData of productTools) {
        // Load tool skills
        const { data: skills } = await this.supabase
          .from('tool_skills')
          .select('*')
          .eq('tool_id', toolData.id)
          .eq('is_active', true);

        // Reconstruct tool object
        const tool: Tool = {
          id: toolData.id,
          name: toolData.name,
          description: toolData.description,
          category: toolData.type,
          provider: toolData.config?.provider || 'custom',
          version: toolData.config?.version || '1.0.0',
          isActive: toolData.is_active,
          requiresAuth: toolData.config?.requiresAuth || false,
          skills: (skills || []).map((skill: any) => ({
            name: skill.skill_name,
            toolId: skill.tool_id,
            description: skill.description,
            parameters: skill.parameters || [],
            requiredPermissions: skill.required_permissions || [],
            execute: async (params: any, context: any) => {
              // This will be implemented by the actual tool implementation
              console.warn(`Skill ${skill.skill_name} execution not implemented from database`);
              return {};
            }
          })),
          execute: async (skillName: string, params: any, context: any) => {
            return this.localRegistry.executeSkill(skillName, params, context);
          }
        };

        // Register in local registry
        this.localRegistry.registerTool(tool);
      }

      console.log(`✅ Local registry synced: ${productTools.length} tools loaded`);
    } catch (error) {
      console.error('Failed to sync tool registry:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productToolRegistry = ProductToolRegistry.getInstance();


