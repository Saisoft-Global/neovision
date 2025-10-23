/**
 * Organization Tool Service
 * Manages organization-level tool enablement and configuration
 * 
 * 3-Tier Architecture:
 * 1. Product-level tools (global registry)
 * 2. Organization-enabled tools (this service)
 * 3. Agent-attached tools (agent_tools table)
 */

import { getSupabaseClient } from '../../config/supabase';
import type { Tool } from '../../types/tool-framework';

export interface OrganizationTool {
  id: string;
  organization_id: string;
  tool_id: string;
  is_enabled: boolean;
  config_overrides?: Record<string, any>;
  max_usage_per_day?: number;
  cost_allocation?: string;
  allowed_roles?: string[];
  restricted_skills?: string[];
  enabled_by?: string;
  enabled_at?: string;
  disabled_at?: string;
  disabled_by?: string;
}

export interface ProductLevelTool {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  is_system_tool: boolean;
  is_public: boolean;
  skill_count: number;
}

export class OrganizationToolService {
  private static instance: OrganizationToolService;
  private supabase = getSupabaseClient();

  private constructor() {}

  public static getInstance(): OrganizationToolService {
    if (!this.instance) {
      this.instance = new OrganizationToolService();
    }
    return this.instance;
  }

  /**
   * Get all product-level tools available for organizations to enable
   */
  async getAvailableProductTools(): Promise<ProductLevelTool[]> {
    const { data, error } = await this.supabase
      .from('tools')
      .select(`
        id,
        name,
        description,
        type,
        is_active,
        is_system_tool,
        is_public
      `)
      .eq('is_active', true)
      .eq('is_public', true)
      .is('organization_id', null); // Product-level tools only

    if (error) {
      console.error('Error fetching product tools:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get tools enabled for a specific organization
   */
  async getOrganizationEnabledTools(organizationId: string): Promise<OrganizationTool[]> {
    const { data, error } = await this.supabase
      .from('organization_tools')
      .select(`
        *,
        tools:tool_id (
          id,
          name,
          description,
          type,
          is_active
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching organization tools:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Enable a product-level tool for an organization
   */
  async enableToolForOrganization(
    organizationId: string,
    toolId: string,
    userId: string,
    options?: {
      configOverrides?: Record<string, any>;
      maxUsagePerDay?: number;
      allowedRoles?: string[];
      restrictedSkills?: string[];
    }
  ): Promise<OrganizationTool> {
    // Verify tool exists and is available
    const { data: tool, error: toolError } = await this.supabase
      .from('tools')
      .select('id, name, is_active, is_public')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      throw new Error(`Tool not found or not available: ${toolId}`);
    }

    if (!tool.is_active) {
      throw new Error(`Tool is not active: ${tool.name}`);
    }

    if (!tool.is_public) {
      throw new Error(`Tool is not publicly available: ${tool.name}`);
    }

    // Check if already enabled
    const { data: existing } = await this.supabase
      .from('organization_tools')
      .select('id, is_enabled')
      .eq('organization_id', organizationId)
      .eq('tool_id', toolId)
      .single();

    if (existing) {
      // Re-enable if disabled
      if (!existing.is_enabled) {
        const { data, error } = await this.supabase
          .from('organization_tools')
          .update({
            is_enabled: true,
            enabled_by: userId,
            enabled_at: new Date().toISOString(),
            disabled_at: null,
            disabled_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
      
      return existing;
    }

    // Create new organization_tool record
    const { data, error } = await this.supabase
      .from('organization_tools')
      .insert({
        organization_id: organizationId,
        tool_id: toolId,
        is_enabled: true,
        config_overrides: options?.configOverrides || {},
        max_usage_per_day: options?.maxUsagePerDay,
        allowed_roles: options?.allowedRoles || ['owner', 'admin', 'manager', 'member'],
        restricted_skills: options?.restrictedSkills || [],
        enabled_by: userId,
        enabled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error enabling tool for organization:', error);
      throw error;
    }

    console.log(`✅ Tool "${tool.name}" enabled for organization ${organizationId}`);
    return data;
  }

  /**
   * Disable a tool for an organization
   */
  async disableToolForOrganization(
    organizationId: string,
    toolId: string,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('organization_tools')
      .update({
        is_enabled: false,
        disabled_by: userId,
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('tool_id', toolId);

    if (error) {
      console.error('Error disabling tool:', error);
      throw error;
    }

    console.log(`⏸️  Tool disabled for organization ${organizationId}`);
  }

  /**
   * Update tool configuration for an organization
   */
  async updateToolConfiguration(
    organizationId: string,
    toolId: string,
    configOverrides: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('organization_tools')
      .update({
        config_overrides: configOverrides,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('tool_id', toolId);

    if (error) {
      console.error('Error updating tool configuration:', error);
      throw error;
    }

    console.log(`🔧 Tool configuration updated for organization ${organizationId}`);
  }

  /**
   * Check if organization has a specific tool enabled
   */
  async isToolEnabledForOrganization(
    organizationId: string,
    toolId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('organization_tools')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('tool_id', toolId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_enabled;
  }

  /**
   * Get tools available for an agent to attach
   * Only returns tools that are enabled for the agent's organization
   */
  async getToolsForAgent(agentId: string): Promise<Tool[]> {
    // Get agent's organization
    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select('organization_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (!agent.organization_id) {
      // No organization - return only system tools
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .eq('is_system_tool', true)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    }

    // Get organization-enabled tools
    const { data, error } = await this.supabase
      .from('organization_tools')
      .select(`
        tool_id,
        config_overrides,
        tools:tool_id (
          id,
          name,
          description,
          type,
          category,
          provider,
          version,
          is_active
        )
      `)
      .eq('organization_id', agent.organization_id)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching organization tools:', error);
      throw error;
    }

    // Transform and merge config overrides
    return (data || []).map((item: any) => ({
      ...item.tools,
      config: {
        ...item.tools.config,
        ...item.config_overrides
      }
    }));
  }

  /**
   * Get usage statistics for a tool in an organization
   */
  async getToolUsageStats(organizationId: string, toolId: string): Promise<{
    totalExecutions: number;
    todayExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    // This would query an execution_logs table (to be implemented)
    // For now, return placeholder
    return {
      totalExecutions: 0,
      todayExecutions: 0,
      avgExecutionTime: 0,
      successRate: 100
    };
  }
}

// Export singleton instance
export const organizationToolService = OrganizationToolService.getInstance();


