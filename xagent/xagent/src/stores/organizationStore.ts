/**
 * Organization Store
 * Manages organization state, membership, and context switching
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { organizationService, type Organization } from '../services/organization/OrganizationService';
import { membershipService, type OrganizationMember, type MemberRole } from '../services/organization/MembershipService';
import { llmConfigManager } from '../services/llm/LLMConfigManager';
import { AgentFactory } from '../services/agent/AgentFactory';
import { MemoryService } from '../services/memory/MemoryService';
import { vectorService } from '../services/vector/VectorService';

interface OrganizationState {
  // Current State
  currentOrganization: Organization | null;
  currentMembership: OrganizationMember | null;
  organizations: Organization[];
  members: OrganizationMember[];
  
  // Loading States
  isLoading: boolean;
  isLoadingMembers: boolean;
  isSwitchingOrg: boolean;
  
  // Error State
  error: string | null;
  
  // Actions
  loadUserOrganizations: (userId: string) => Promise<void>;
  setCurrentOrganization: (organizationId: string, userId: string) => Promise<void>;
  switchOrganization: (organizationId: string, userId: string) => Promise<void>;
  refreshCurrentOrganization: () => Promise<void>;
  createOrganization: (name: string, slug: string, userId: string) => Promise<Organization | null>;
  updateOrganization: (organizationId: string, updates: any) => Promise<void>;
  
  // Member Actions
  loadMembers: (organizationId: string) => Promise<void>;
  inviteMember: (organizationId: string, email: string, role: MemberRole, invitedBy: string) => Promise<void>;
  removeMember: (organizationId: string, userId: string) => Promise<void>;
  updateMemberRole: (organizationId: string, userId: string, role: MemberRole) => Promise<void>;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  canCreateAgents: () => boolean;
  canInviteMembers: () => boolean;
  canManageSettings: () => boolean;
  
  // Cleanup
  clearOrganizationContext: () => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentOrganization: null,
      currentMembership: null,
      organizations: [],
      members: [],
      isLoading: false,
      isLoadingMembers: false,
      isSwitchingOrg: false,
      error: null,

      // Load all organizations user belongs to
      loadUserOrganizations: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('🏢 Loading user organizations for:', userId);
          const orgs = await organizationService.getUserOrganizations(userId);
          
          set({ 
            organizations: orgs,
            isLoading: false 
          });

          // If no current organization, set the first one
          const current = get().currentOrganization;
          if (!current && orgs.length > 0) {
            await get().setCurrentOrganization(orgs[0].id, userId);
          }

          console.log(`✅ Loaded ${orgs.length} organizations`);
        } catch (error) {
          console.error('❌ Error loading organizations:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load organizations',
            isLoading: false 
          });
        }
      },

      // Set current organization (without triggering full switch)
      setCurrentOrganization: async (organizationId: string, userId: string) => {
        try {
          console.log('🏢 Setting current organization:', organizationId);
          
          // Load organization details
          const org = await organizationService.getOrganization(organizationId);
          if (!org) {
            throw new Error('Organization not found');
          }

          // Load user's membership
          const membership = await membershipService.getUserMembership(organizationId, userId);
          if (!membership) {
            throw new Error('User is not a member of this organization');
          }

          set({ 
            currentOrganization: org,
            currentMembership: membership
          });

          // Update LLM config with organization context
          await llmConfigManager.loadOrganizationSettings(organizationId);
          await llmConfigManager.loadUserSettings(userId, organizationId);

          // Update Agent Factory context
          const agentFactory = AgentFactory.getInstance();
          agentFactory.setOrganizationContext({
            organizationId,
            userId,
            visibility: 'organization'
          });

          // Update Memory Service context
          const memoryService = MemoryService.getInstance();
          memoryService.setOrganizationContext(organizationId);

          // Update Vector Service context
          vectorService.setOrganizationContext(organizationId);

          console.log('✅ Organization context set successfully');
        } catch (error) {
          console.error('❌ Error setting organization:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to set organization' });
          throw error;
        }
      },

      // Switch to a different organization
      switchOrganization: async (organizationId: string, userId: string) => {
        set({ isSwitchingOrg: true, error: null });
        try {
          console.log('🔄 Switching to organization:', organizationId);
          
          // Clear current context
          get().clearOrganizationContext();
          
          // Set new organization
          await get().setCurrentOrganization(organizationId, userId);
          
          // Load members for new org
          await get().loadMembers(organizationId);
          
          set({ isSwitchingOrg: false });
          console.log('✅ Organization switched successfully');
        } catch (error) {
          console.error('❌ Error switching organization:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to switch organization',
            isSwitchingOrg: false 
          });
        }
      },

      // Refresh current organization data
      refreshCurrentOrganization: async () => {
        const current = get().currentOrganization;
        if (!current) return;

        try {
          const updated = await organizationService.getOrganization(current.id);
          if (updated) {
            set({ currentOrganization: updated });
          }
        } catch (error) {
          console.error('❌ Error refreshing organization:', error);
        }
      },

      // Create new organization
      createOrganization: async (name: string, slug: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('🏢 Creating organization:', name);
          
          const org = await organizationService.createOrganization(
            { name, slug, display_name: name },
            userId
          );

          if (!org) {
            throw new Error('Failed to create organization');
          }

          // Refresh organizations list
          await get().loadUserOrganizations(userId);

          // Switch to new organization
          await get().switchOrganization(org.id, userId);

          set({ isLoading: false });
          console.log('✅ Organization created successfully');
          return org;
        } catch (error) {
          console.error('❌ Error creating organization:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create organization',
            isLoading: false 
          });
          return null;
        }
      },

      // Update organization
      updateOrganization: async (organizationId: string, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          await organizationService.updateOrganization(organizationId, updates);
          await get().refreshCurrentOrganization();
          set({ isLoading: false });
        } catch (error) {
          console.error('❌ Error updating organization:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update organization',
            isLoading: false 
          });
        }
      },

      // Load organization members
      loadMembers: async (organizationId: string) => {
        set({ isLoadingMembers: true });
        try {
          const members = await membershipService.getOrganizationMembers(organizationId);
          set({ members, isLoadingMembers: false });
        } catch (error) {
          console.error('❌ Error loading members:', error);
          set({ isLoadingMembers: false });
        }
      },

      // Invite member
      inviteMember: async (organizationId: string, email: string, role: MemberRole, invitedBy: string) => {
        try {
          await membershipService.inviteUser(organizationId, email, role, invitedBy);
          // Optionally refresh members or pending invitations
          console.log('✅ Member invited successfully');
        } catch (error) {
          console.error('❌ Error inviting member:', error);
          throw error;
        }
      },

      // Remove member
      removeMember: async (organizationId: string, userId: string) => {
        try {
          await membershipService.removeMember(organizationId, userId);
          await get().loadMembers(organizationId);
          console.log('✅ Member removed successfully');
        } catch (error) {
          console.error('❌ Error removing member:', error);
          throw error;
        }
      },

      // Update member role
      updateMemberRole: async (organizationId: string, userId: string, role: MemberRole) => {
        try {
          await membershipService.updateMemberRole(organizationId, userId, role);
          await get().loadMembers(organizationId);
          console.log('✅ Member role updated successfully');
        } catch (error) {
          console.error('❌ Error updating member role:', error);
          throw error;
        }
      },

      // Check if user has permission
      hasPermission: (permission: string) => {
        const membership = get().currentMembership;
        if (!membership) return false;

        // Owners and admins have all permissions
        if (membership.role === 'owner' || membership.role === 'admin') {
          return true;
        }

        // Parse permission path (e.g., "agents.create")
        const parts = permission.split('.');
        if (parts.length !== 2) return false;

        const [resource, action] = parts;
        return membership.permissions?.[resource]?.[action] === true;
      },

      // Permission helpers
      canCreateAgents: () => {
        return get().hasPermission('agents.create');
      },

      canInviteMembers: () => {
        return get().hasPermission('members.invite');
      },

      canManageSettings: () => {
        return get().hasPermission('settings.edit');
      },

      // Clear organization context
      clearOrganizationContext: () => {
        // Clear LLM config
        llmConfigManager.clearOrganizationSettings();
        
        // Clear Agent Factory context
        const agentFactory = AgentFactory.getInstance();
        agentFactory.clearOrganizationContext();
        
        // Clear Memory Service context
        const memoryService = MemoryService.getInstance();
        memoryService.setOrganizationContext(null);
        
        // Clear Vector Service context
        vectorService.setOrganizationContext(null);
        
        console.log('🔄 Organization context cleared');
      },

      // Reset entire store
      reset: () => {
        get().clearOrganizationContext();
        set({
          currentOrganization: null,
          currentMembership: null,
          organizations: [],
          members: [],
          isLoading: false,
          isLoadingMembers: false,
          isSwitchingOrg: false,
          error: null
        });
      }
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        organizations: state.organizations
      })
    }
  )
);


