/**
 * Organization Service
 * Manages organization CRUD operations, settings, and configuration
 */

import { getSupabaseClient } from '../../config/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  plan: 'trial' | 'starter' | 'business' | 'enterprise' | 'custom';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  trial_ends_at?: string;
  subscription_id?: string;
  settings: OrganizationSettings;
  billing_email?: string;
  contact_name?: string;
  contact_phone?: string;
  address?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  features: {
    max_agents: number;
    max_workflows: number;
    max_users: number;
    max_storage_gb: number;
    ai_credits_monthly: number;
    custom_llm_keys: boolean;
    api_access: boolean;
    priority_support: boolean;
    sso_enabled: boolean;
  };
  branding?: {
    primary_color?: string;
    custom_domain?: string;
  };
  security?: {
    require_2fa?: boolean;
    ip_whitelist?: string[];
    session_timeout_minutes?: number;
  };
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  plan?: Organization['plan'];
  billing_email?: string;
  contact_name?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  billing_email?: string;
  contact_name?: string;
  contact_phone?: string;
  address?: Record<string, any>;
  settings?: Partial<OrganizationSettings>;
  metadata?: Record<string, any>;
}

export class OrganizationService {
  private static instance: OrganizationService;
  private supabase = getSupabaseClient();

  private constructor() {}

  public static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('❌ Error fetching organization:', error);
        return null;
      }

      return data as Organization;
    } catch (error) {
      console.error('❌ Exception in getOrganization:', error);
      return null;
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('❌ Error fetching organization by slug:', error);
        return null;
      }

      return data as Organization;
    } catch (error) {
      console.error('❌ Exception in getOrganizationBySlug:', error);
      return null;
    }
  }

  /**
   * Get all organizations for current user
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_organizations', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error fetching user organizations:', error);
        return [];
      }

      // Fetch full organization details
      if (!data || data.length === 0) {
        return [];
      }

      const orgIds = data.map((item: any) => item.organization_id);
      const { data: orgs, error: orgsError } = await this.supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) {
        console.error('❌ Error fetching organization details:', orgsError);
        return [];
      }

      return (orgs as Organization[]) || [];
    } catch (error) {
      console.error('❌ Exception in getUserOrganizations:', error);
      return [];
    }
  }

  /**
   * Create a new organization
   */
  async createOrganization(
    input: CreateOrganizationInput,
    ownerId: string
  ): Promise<Organization | null> {
    try {
      console.log('🏢 Creating organization:', input.name);

      // Check if slug is available
      const existing = await this.getOrganizationBySlug(input.slug);
      if (existing) {
        throw new Error(`Organization slug '${input.slug}' is already taken`);
      }

      // Create organization
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: input.name,
          slug: input.slug,
          display_name: input.display_name,
          description: input.description,
          plan: input.plan || 'trial',
          status: 'active',
          billing_email: input.billing_email,
          contact_name: input.contact_name,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
        })
        .select()
        .single();

      if (orgError) {
        console.error('❌ Error creating organization:', orgError);
        throw orgError;
      }

      // Add owner as first member
      const { error: memberError } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: ownerId,
          role: 'owner',
          status: 'active'
        });

      if (memberError) {
        console.error('❌ Error adding owner to organization:', memberError);
        // Rollback organization creation
        await this.supabase.from('organizations').delete().eq('id', org.id);
        throw memberError;
      }

      console.log('✅ Organization created successfully:', org.id);
      return org as Organization;
    } catch (error) {
      console.error('❌ Exception in createOrganization:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    updates: UpdateOrganizationInput
  ): Promise<Organization | null> {
    try {
      console.log('🔄 Updating organization:', organizationId);

      const updateData: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Merge settings if provided
      if (updates.settings) {
        const current = await this.getOrganization(organizationId);
        if (current) {
          updateData.settings = {
            ...current.settings,
            ...updates.settings,
            features: {
              ...current.settings.features,
              ...updates.settings.features
            }
          };
        }
      }

      const { data, error } = await this.supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating organization:', error);
        throw error;
      }

      console.log('✅ Organization updated successfully');
      return data as Organization;
    } catch (error) {
      console.error('❌ Exception in updateOrganization:', error);
      throw error;
    }
  }

  /**
   * Delete organization (soft delete by changing status)
   */
  async deleteOrganization(organizationId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting organization:', organizationId);

      const { error } = await this.supabase
        .from('organizations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (error) {
        console.error('❌ Error deleting organization:', error);
        return false;
      }

      console.log('✅ Organization deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception in deleteOrganization:', error);
      return false;
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<boolean> {
    try {
      return (await this.updateOrganization(organizationId, { settings })) !== null;
    } catch (error) {
      console.error('❌ Exception in updateSettings:', error);
      return false;
    }
  }

  /**
   * Check if organization has reached a limit
   */
  async checkLimit(
    organizationId: string,
    limitType: keyof OrganizationSettings['features']
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    try {
      const org = await this.getOrganization(organizationId);
      if (!org) {
        return { allowed: false, current: 0, limit: 0 };
      }

      const limit = org.settings.features[limitType];

      // Get current usage based on limit type
      let current = 0;
      switch (limitType) {
        case 'max_agents':
          const { count: agentCount } = await this.supabase
            .from('agents')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
          current = agentCount || 0;
          break;

        case 'max_workflows':
          const { count: workflowCount } = await this.supabase
            .from('workflows')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
          current = workflowCount || 0;
          break;

        case 'max_users':
          const { count: userCount } = await this.supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          current = userCount || 0;
          break;

        default:
          // For other limits, assume not reached
          return { allowed: true, current: 0, limit: Number(limit) || 0 };
      }

      return {
        allowed: current < Number(limit),
        current,
        limit: Number(limit) || 0
      };
    } catch (error) {
      console.error('❌ Exception in checkLimit:', error);
      return { allowed: false, current: 0, limit: 0 };
    }
  }

  /**
   * Get organization resource summary
   */
  async getResourceSummary(organizationId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('organization_resource_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('❌ Error fetching resource summary:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception in getResourceSummary:', error);
      return null;
    }
  }

  /**
   * Create personal workspace for user
   */
  async createPersonalOrganization(userId: string, userEmail: string): Promise<Organization | null> {
    try {
      console.log('🏢 Creating personal organization for user:', userEmail);

      const { data, error } = await this.supabase.rpc('create_personal_organization', {
        p_user_id: userId,
        p_user_email: userEmail
      });

      if (error) {
        console.error('❌ Error creating personal organization:', error);
        throw error;
      }

      // Fetch the created organization
      return await this.getOrganization(data);
    } catch (error) {
      console.error('❌ Exception in createPersonalOrganization:', error);
      return null;
    }
  }
}

export const organizationService = OrganizationService.getInstance();


