/**
 * Organization Initializer
 * Initializes the organization store when user is authenticated
 */

import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

export const OrganizationInitializer: React.FC = () => {
  const { user } = useAuthStore();
  const { loadUserOrganizations, currentOrganization } = useOrganizationStore();

  useEffect(() => {
    const initializeOrganization = async () => {
      if (user && !currentOrganization) {
        try {
          console.log('🏢 Initializing organization context for user:', user.email);
          await loadUserOrganizations(user.id);
        } catch (error) {
          console.error('Failed to initialize organization context:', error);
        }
      }
    };

    initializeOrganization();
  }, [user, currentOrganization, loadUserOrganizations]);

  // This component doesn't render anything
  return null;
};
