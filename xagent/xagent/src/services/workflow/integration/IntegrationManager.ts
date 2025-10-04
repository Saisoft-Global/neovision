import { supabase } from '../../../config/supabase';
import type { WorkflowIntegration } from '../../../types/workflow';

export class IntegrationManager {
  private static instance: IntegrationManager;

  public static getInstance(): IntegrationManager {
    if (!this.instance) {
      this.instance = new IntegrationManager();
    }
    return this.instance;
  }

  async addIntegration(workflowId: string, integration: Partial<WorkflowIntegration>): Promise<WorkflowIntegration> {
    const { data, error } = await supabase
      .from('workflow_integrations')
      .insert({
        workflow_id: workflowId,
        service: integration.service,
        config: integration.config,
        credentials: integration.credentials,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async testConnection(integration: WorkflowIntegration): Promise<boolean> {
    // Implement connection testing based on integration type
    switch (integration.service) {
      case 'http':
        return this.testHttpConnection(integration);
      case 'salesforce':
        return this.testSalesforceConnection(integration);
      // Add more integration types
      default:
        throw new Error(`Unsupported integration type: ${integration.service}`);
    }
  }

  private async testHttpConnection(integration: WorkflowIntegration): Promise<boolean> {
    try {
      const response = await fetch(integration.config.url, {
        method: 'GET',
        headers: integration.credentials as Record<string, string>,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testSalesforceConnection(integration: WorkflowIntegration): Promise<boolean> {
    // Implement Salesforce connection test
    return true;
  }
}