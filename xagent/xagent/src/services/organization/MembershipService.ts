/**
 * Membership Service
 * Manages organization membership, invitations, and member permissions
 */

import { getSupabaseClient } from '../../config/supabase/client';
import crypto from 'crypto';

export type MemberRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'guest';
export type MemberStatus = 'active' | 'inactive' | 'invited' | 'suspended';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  permissions: MemberPermissions;
  status: MemberStatus;
  invitation_token?: string;
  invitation_expires_at?: string;
  invited_by?: string;
  joined_at: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberPermissions {
  agents: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
  };
  workflows: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
  };
  documents: {
    upload: boolean;
    read: boolean;
    delete: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
  members: {
    invite: boolean;
    remove: boolean;
    edit_roles: boolean;
  };
  billing: {
    view: boolean;
    edit: boolean;
  };
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: MemberRole;
  permissions?: MemberPermissions;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  accepted_by?: string;
  message?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberWithUser extends OrganizationMember {
  user_email?: string;
  user_name?: string;
}

const DEFAULT_PERMISSIONS: Record<MemberRole, MemberPermissions> = {
  owner: {
    agents: { create: true, read: true, update: true, delete: true, share: true },
    workflows: { create: true, read: true, update: true, delete: true, share: true },
    documents: { upload: true, read: true, delete: true },
    settings: { view: true, edit: true },
    members: { invite: true, remove: true, edit_roles: true },
    billing: { view: true, edit: true }
  },
  admin: {
    agents: { create: true, read: true, update: true, delete: true, share: true },
    workflows: { create: true, read: true, update: true, delete: true, share: true },
    documents: { upload: true, read: true, delete: true },
    settings: { view: true, edit: true },
    members: { invite: true, remove: true, edit_roles: true },
    billing: { view: true, edit: false }
  },
  manager: {
    agents: { create: true, read: true, update: true, delete: false, share: true },
    workflows: { create: true, read: true, update: true, delete: false, share: true },
    documents: { upload: true, read: true, delete: false },
    settings: { view: true, edit: false },
    members: { invite: true, remove: false, edit_roles: false },
    billing: { view: false, edit: false }
  },
  member: {
    agents: { create: true, read: true, update: true, delete: false, share: true },
    workflows: { create: true, read: true, update: true, delete: false, share: true },
    documents: { upload: true, read: true, delete: false },
    settings: { view: true, edit: false },
    members: { invite: false, remove: false, edit_roles: false },
    billing: { view: false, edit: false }
  },
  viewer: {
    agents: { create: false, read: true, update: false, delete: false, share: false },
    workflows: { create: false, read: true, update: false, delete: false, share: false },
    documents: { upload: false, read: true, delete: false },
    settings: { view: true, edit: false },
    members: { invite: false, remove: false, edit_roles: false },
    billing: { view: false, edit: false }
  },
  guest: {
    agents: { create: false, read: true, update: false, delete: false, share: false },
    workflows: { create: false, read: true, update: false, delete: false, share: false },
    documents: { upload: false, read: true, delete: false },
    settings: { view: false, edit: false },
    members: { invite: false, remove: false, edit_roles: false },
    billing: { view: false, edit: false }
  }
};

export class MembershipService {
  private static instance: MembershipService;
  private supabase = getSupabaseClient();

  private constructor() {}

  public static getInstance(): MembershipService {
    if (!MembershipService.instance) {
      MembershipService.instance = new MembershipService();
    }
    return MembershipService.instance;
  }

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId: string): Promise<MemberWithUser[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          user:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching members:', error);
        return [];
      }

      return data.map((member: any) => ({
        ...member,
        user_email: member.user?.email,
        user_name: member.user?.raw_user_meta_data?.full_name || member.user?.email
      })) as MemberWithUser[];
    } catch (error) {
      console.error('❌ Exception in getOrganizationMembers:', error);
      return [];
    }
  }

  /**
   * Get user's membership in an organization
   */
  async getUserMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('❌ Error fetching membership:', error);
        return null;
      }

      return data as OrganizationMember;
    } catch (error) {
      console.error('❌ Exception in getUserMembership:', error);
      return null;
    }
  }

  /**
   * Invite a user to an organization
   */
  async inviteUser(
    organizationId: string,
    email: string,
    role: MemberRole,
    invitedBy: string,
    message?: string
  ): Promise<OrganizationInvitation | null> {
    try {
      console.log('📧 Inviting user to organization:', email);

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const { data, error } = await this.supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
          email: email.toLowerCase(),
          role,
          permissions: DEFAULT_PERMISSIONS[role],
          token,
          status: 'pending',
          invited_by: invitedBy,
          message,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating invitation:', error);
        throw error;
      }

      console.log('✅ Invitation created successfully');
      // TODO: Send invitation email
      return data as OrganizationInvitation;
    } catch (error) {
      console.error('❌ Exception in inviteUser:', error);
      throw error;
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember | null> {
    try {
      console.log('✅ Accepting invitation');

      // Get invitation
      const { data: invitation, error: invError } = await this.supabase
        .from('organization_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (invError || !invitation) {
        console.error('❌ Invitation not found or expired');
        return null;
      }

      // Check if invitation expired
      if (new Date(invitation.expires_at) < new Date()) {
        await this.supabase
          .from('organization_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        console.error('❌ Invitation has expired');
        return null;
      }

      // Check if user already a member
      const existing = await this.getUserMembership(invitation.organization_id, userId);
      if (existing) {
        console.error('❌ User is already a member');
        return existing;
      }

      // Add user as member
      const { data: member, error: memberError } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
          permissions: invitation.permissions || DEFAULT_PERMISSIONS[invitation.role],
          status: 'active'
        })
        .select()
        .single();

      if (memberError) {
        console.error('❌ Error adding member:', memberError);
        throw memberError;
      }

      // Update invitation status
      await this.supabase
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_by: userId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      console.log('✅ Invitation accepted successfully');
      return member as OrganizationMember;
    } catch (error) {
      console.error('❌ Exception in acceptInvitation:', error);
      throw error;
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Removing member from organization');

      const { error } = await this.supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing member:', error);
        return false;
      }

      console.log('✅ Member removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception in removeMember:', error);
      return false;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: MemberRole
  ): Promise<OrganizationMember | null> {
    try {
      console.log('🔄 Updating member role:', newRole);

      const { data, error } = await this.supabase
        .from('organization_members')
        .update({
          role: newRole,
          permissions: DEFAULT_PERMISSIONS[newRole],
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating role:', error);
        return null;
      }

      console.log('✅ Role updated successfully');
      return data as OrganizationMember;
    } catch (error) {
      console.error('❌ Exception in updateMemberRole:', error);
      return null;
    }
  }

  /**
   * Update member permissions (custom permissions)
   */
  async updateMemberPermissions(
    organizationId: string,
    userId: string,
    permissions: Partial<MemberPermissions>
  ): Promise<OrganizationMember | null> {
    try {
      console.log('🔄 Updating member permissions');

      // Get current member
      const current = await this.getUserMembership(organizationId, userId);
      if (!current) {
        return null;
      }

      // Merge permissions
      const updatedPermissions = {
        ...current.permissions,
        ...permissions
      };

      const { data, error } = await this.supabase
        .from('organization_members')
        .update({
          permissions: updatedPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating permissions:', error);
        return null;
      }

      console.log('✅ Permissions updated successfully');
      return data as OrganizationMember;
    } catch (error) {
      console.error('❌ Exception in updateMemberPermissions:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    organizationId: string,
    userId: string,
    permissionPath: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('user_has_org_permission', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_permission_path: permissionPath
      });

      if (error) {
        console.error('❌ Error checking permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('❌ Exception in hasPermission:', error);
      return false;
    }
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching invitations:', error);
        return [];
      }

      return data as OrganizationInvitation[];
    } catch (error) {
      console.error('❌ Exception in getPendingInvitations:', error);
      return [];
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('organization_invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        console.error('❌ Error cancelling invitation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception in cancelInvitation:', error);
      return false;
    }
  }

  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role: MemberRole): MemberPermissions {
    return DEFAULT_PERMISSIONS[role];
  }

  /**
   * Update member last active timestamp
   */
  async updateLastActive(organizationId: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('organization_members')
        .update({
          last_active_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
    } catch (error) {
      // Silent fail - not critical
      console.debug('Failed to update last active:', error);
    }
  }
}

export const membershipService = MembershipService.getInstance();


