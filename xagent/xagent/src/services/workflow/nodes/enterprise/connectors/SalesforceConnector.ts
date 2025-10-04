import { EnterpriseConnector, EnterpriseCredentials } from '../types';

export class SalesforceConnector implements EnterpriseConnector {
  private client: any = null;
  private accessToken: string | null = null;

  async connect(credentials: EnterpriseCredentials): Promise<void> {
    try {
      // Authenticate with Salesforce
      const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Salesforce authentication failed');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.client = { connected: true };
    } catch (error) {
      console.error('Salesforce connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
  }

  async execute(operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Salesforce');
    }

    const baseUrl = `${this.client.instanceUrl}/services/data/v57.0/sobjects/${params.object}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    switch (operation) {
      case 'query':
        return this.executeQuery(params.soql as string);
      case 'create':
        return this.executeCreate(baseUrl, headers, params);
      case 'update':
        return this.executeUpdate(baseUrl, headers, params);
      case 'delete':
        return this.executeDelete(baseUrl, headers, params);
      default:
        throw new Error(`Unsupported Salesforce operation: ${operation}`);
    }
  }

  isConnected(): boolean {
    return Boolean(this.client?.connected && this.accessToken);
  }

  private async executeQuery(soql: string): Promise<unknown> {
    const response = await fetch(
      `${this.client.instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }
    );
    return response.json();
  }

  private async executeCreate(baseUrl: string, headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(params.data),
    });
    return response.json();
  }

  private async executeUpdate(baseUrl: string, headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}/${params.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(params.data),
    });
    return response.status === 204;
  }

  private async executeDelete(baseUrl: string, headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}/${params.id}`, {
      method: 'DELETE',
      headers,
    });
    return response.status === 204;
  }
}