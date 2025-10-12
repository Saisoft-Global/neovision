/**
 * Audit Log Service
 * Tracks all organization activities for compliance and security
 */

import { getSupabaseClient } from '../../lib/supabase';

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'invited'
  | 'removed'
  | 'accepted'
  | 'rejected'
  | 'shared'
  | 'unshared'
  | 'executed'
  | 'archived'
  | 'restored';

export type AuditResourceType =
  | 'agent'
  | 'workflow'
  | 'document'
  | 'member'
  | 'invitation'
  | 'settings'
  | 'llm_settings'
  | 'organization'
  | 'billing';

export class AuditLogService {
  private static instance: AuditLogService;
  private supabase = getSupabaseClient();

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Log an audit event
   */
  async log(
    organizationId: string,
    action: AuditAction,
    resourceType: AuditResourceType,
    options?: {
      userId?: string;
      userEmail?: string;
      resourceId?: string;
      changes?: Record<string, any>;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await this.supabase.from('organization_audit_logs').insert({
        organization_id: organizationId,
        user_id: options?.userId,
        user_email: options?.userEmail,
        action,
        resource_type: resourceType,
        resource_id: options?.resourceId,
        changes: options?.changes,
        metadata: options?.metadata,
        ip_address: options?.ipAddress,
        user_agent: options?.userAgent
      });
    } catch (error) {
      // Don't fail the operation if audit logging fails
      console.error('❌ Failed to log audit event:', error);
    }
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      resourceType?: AuditResourceType;
      action?: AuditAction;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<AuditLog[]> {
    try {
      let query = this.supabase
        .from('organization_audit_logs')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100)
        .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 100) - 1);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        return [];
      }

      return data as AuditLog[];
    } catch (error) {
      console.error('❌ Exception in getOrganizationLogs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceLogs(
    organizationId: string,
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching resource logs:', error);
        return [];
      }

      return data as AuditLog[];
    } catch (error) {
      console.error('❌ Exception in getResourceLogs:', error);
      return [];
    }
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(
    organizationId: string,
    hours: number = 24
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    activeUsers: number;
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('organization_audit_logs')
        .select('action, resource_type, user_id')
        .eq('organization_id', organizationId)
        .gte('created_at', since);

      if (error) {
        console.error('❌ Error fetching recent activity:', error);
        return { totalEvents: 0, eventsByType: {}, activeUsers: 0 };
      }

      const eventsByType: Record<string, number> = {};
      const uniqueUsers = new Set<string>();

      data.forEach((log: any) => {
        const key = `${log.resource_type}_${log.action}`;
        eventsByType[key] = (eventsByType[key] || 0) + 1;
        if (log.user_id) {
          uniqueUsers.add(log.user_id);
        }
      });

      return {
        totalEvents: data.length,
        eventsByType,
        activeUsers: uniqueUsers.size
      };
    } catch (error) {
      console.error('❌ Exception in getRecentActivity:', error);
      return { totalEvents: 0, eventsByType: {}, activeUsers: 0 };
    }
  }
}

export const auditLogService = AuditLogService.getInstance();

