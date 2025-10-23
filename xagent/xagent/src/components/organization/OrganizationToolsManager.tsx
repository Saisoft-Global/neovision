/**
 * Organization Tools Manager
 * Allows organization admins to enable/disable product-level tools
 * 
 * Architecture:
 * - Product-level tools are registered globally
 * - Organizations enable tools they want to use
 * - Agents can only attach tools enabled for their organization
 */

import React, { useEffect, useState } from 'react';
import { Shield, Check, X, Settings, Info, Zap } from 'lucide-react';
import { organizationToolService, type ProductLevelTool } from '../../services/tools/OrganizationToolService';
import { useOrganizationStore } from '../../stores/organizationStore';

export const OrganizationToolsManager: React.FC = () => {
  const { currentOrganization, currentMembership } = useOrganizationStore();
  const [productTools, setProductTools] = useState<ProductLevelTool[]>([]);
  const [enabledToolIds, setEnabledToolIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has permission to manage tools
  const canManageTools = currentMembership?.role && ['owner', 'admin'].includes(currentMembership.role);

  useEffect(() => {
    if (currentOrganization) {
      loadTools();
    }
  }, [currentOrganization]);

  const loadTools = async () => {
    if (!currentOrganization) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load product-level tools
      const available = await organizationToolService.getAvailableProductTools();
      setProductTools(available);

      // Load organization-enabled tools
      const enabled = await organizationToolService.getOrganizationEnabledTools(currentOrganization.id);
      setEnabledToolIds(new Set(enabled.map(t => t.tool_id)));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTool = async (toolId: string, currentlyEnabled: boolean) => {
    if (!currentOrganization || !canManageTools) return;

    try {
      const { data: { user } } = await organizationToolService['supabase'].auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (currentlyEnabled) {
        // Disable tool
        await organizationToolService.disableToolForOrganization(
          currentOrganization.id,
          toolId,
          user.id
        );
        setEnabledToolIds(prev => {
          const next = new Set(prev);
          next.delete(toolId);
          return next;
        });
      } else {
        // Enable tool
        await organizationToolService.enableToolForOrganization(
          currentOrganization.id,
          toolId,
          user.id
        );
        setEnabledToolIds(prev => new Set([...prev, toolId]));
      }

      await loadTools(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle tool');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="text-center p-8 text-gray-500">
        Please select an organization to manage tools
      </div>
    );
  }

  if (!canManageTools) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-yellow-600 mt-1" />
          <div>
            <h3 className="font-semibold text-yellow-900">Permission Required</h3>
            <p className="text-yellow-700 mt-1">
              Only organization owners and admins can manage tools.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Organization Tools</h2>
        <p className="text-gray-600 mt-1">
          Enable tools for your organization. Agents can only use tools that are enabled here.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-blue-900 font-medium">3-Tier Tool Architecture</p>
            <ol className="text-blue-800 mt-2 space-y-1 list-decimal list-inside">
              <li><strong>Product Level</strong>: Tools registered globally (e.g., Email, CRM, Zoho)</li>
              <li><strong>Organization Level</strong>: You enable tools for your organization here</li>
              <li><strong>Agent Level</strong>: Agents attach enabled tools to use them</li>
            </ol>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productTools.map(tool => {
          const isEnabled = enabledToolIds.has(tool.id);

          return (
            <div
              key={tool.id}
              className={`border rounded-lg p-6 transition-all ${
                isEnabled
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Tool Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isEnabled ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Zap className={`w-5 h-5 ${
                      isEnabled ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                    {tool.is_system_tool && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        System Tool
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Status Badge */}
                {isEnabled ? (
                  <div className="flex items-center space-x-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
                    <Check className="w-3 h-3" />
                    <span>Enabled</span>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs">
                    Disabled
                  </div>
                )}
              </div>

              {/* Tool Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {tool.description}
              </p>

              {/* Tool Details */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>Type: {tool.type}</span>
                <span>{tool.skill_count || 0} skills</span>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleTool(tool.id, isEnabled)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    isEnabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isEnabled ? (
                    <span className="flex items-center justify-center space-x-2">
                      <X className="w-4 h-4" />
                      <span>Disable</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Enable</span>
                    </span>
                  )}
                </button>

                {isEnabled && (
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    title="Configure tool"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {productTools.length === 0 && !isLoading && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No product-level tools available</p>
          <p className="text-gray-500 text-sm mt-2">
            Contact support to register new tools
          </p>
        </div>
      )}

      {/* Summary */}
      {productTools.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>{enabledToolIds.size}</strong> of <strong>{productTools.length}</strong> tools enabled
          </div>
          <div className="text-xs text-gray-500">
            Enabled tools are available to all agents in this organization
          </div>
        </div>
      )}
    </div>
  );
};


