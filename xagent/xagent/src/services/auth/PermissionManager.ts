import type { Permission, Role } from '../../types/auth';

export default class PermissionManager {
  private static instance: PermissionManager;
  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions (e.g., "admin:*")
    const wildcardPermission = requiredPermission.split(':')[0] + ':*';
    return userPermissions.includes(wildcardPermission);
  }

  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(userPermissions, permission));
  }

  getRolePermissions(role: Role): string[] {
    switch (role) {
      case 'admin':
        return ['*'];
      case 'manager':
        return Array.from(this.permissions.values())
          .filter(p => !p.name.startsWith('admin:'))
          .map(p => p.name);
      case 'user':
        return Array.from(this.permissions.values())
          .filter(p => p.action === 'read')
          .map(p => p.name);
      default:
        return [];
    }
  }

  private initializePermissions(): void {
    // Agents
    this.addPermission('agents:create', 'Create agents', 'agents', 'create');
    this.addPermission('agents:read', 'View agents', 'agents', 'read');
    this.addPermission('agents:update', 'Update agents', 'agents', 'update');
    this.addPermission('agents:delete', 'Delete agents', 'agents', 'delete');

    // Documents
    this.addPermission('documents:create', 'Upload documents', 'documents', 'create');
    this.addPermission('documents:read', 'View documents', 'documents', 'read');
    this.addPermission('documents:delete', 'Delete documents', 'documents', 'delete');

    // Knowledge
    this.addPermission('knowledge:read', 'View knowledge base', 'knowledge', 'read');
    this.addPermission('knowledge:update', 'Update knowledge', 'knowledge', 'update');
    this.addPermission('knowledge:manage', 'Manage knowledge', 'knowledge', 'manage');

    // Admin
    this.addPermission('admin:users', 'Manage users', 'admin', 'manage');
    this.addPermission('admin:settings', 'Manage settings', 'admin', 'manage');
  }

  private addPermission(
    name: string,
    description: string,
    resource: string,
    action: Permission['action']
  ): void {
    this.permissions.set(name, {
      id: name,
      name,
      description,
      resource,
      action,
    });
  }
}