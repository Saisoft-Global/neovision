/**
 * Organization Selector
 * Dropdown to switch between organizations
 */

import React, { useState } from 'react';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';

export const OrganizationSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const {
    currentOrganization,
    organizations,
    isSwitchingOrg,
    switchOrganization
  } = useOrganizationStore();

  if (!user || organizations.length === 0) {
    return null;
  }

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    try {
      await switchOrganization(orgId, user.id);
      setIsOpen(false);
      // Optionally reload the page to refresh all org-scoped data
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <div className="relative">
      {/* Current Organization Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingOrg}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="max-w-[150px] truncate">
          {currentOrganization?.name || 'Select Organization'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {/* Organizations List */}
            <div className="px-2 py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Your Organizations
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={isSwitchingOrg}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      {org.plan && (
                        <div className="text-xs text-gray-500 capitalize">{org.plan}</div>
                      )}
                    </div>
                  </div>
                  {currentOrganization?.id === org.id && (
                    <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200" />

            {/* Create New Organization */}
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to create organization page
                window.location.href = '/organizations/new';
              }}
              className="w-full flex items-center gap-2 px-5 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Organization</span>
            </button>
          </div>
        </>
      )}

      {/* Loading Indicator */}
      {isSwitchingOrg && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
};


