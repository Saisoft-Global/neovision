import { EnterpriseConnector, EnterpriseCredentials } from '../types';

export class DynamicsConnector implements EnterpriseConnector {
  private client: any = null;
  private accessToken: string | null = null;

  async connect(credentials: EnterpriseCredentials): Promise<void> {
    try {
      // Authenticate with Microsoft Dynamics
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          scope: 'https://dynamics.microsoft.com/.default',
        }),
      });

      if (!response.ok) {
        throw new Error('Dynamics authentication failed');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.client = { 
        connected: true,
        baseUrl: credentials.instanceUrl,
      };
    } catch (error) {
      console.error('Dynamics connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
  }

  async execute(operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Dynamics');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    };

    switch (operation) {
      case 'retrieve':
        return this.executeRetrieve(headers, params);
      case 'create':
        return this.executeCreate(headers, params);
      case 'update':
        return this.executeUpdate(headers, params);
      case 'delete':
        return this.executeDelete(headers, params);
      default:
        throw new Error(`Unsupported Dynamics operation: ${operation}`);
    }
  }

  isConnected(): boolean {
    return Boolean(this.client?.connected && this.accessToken);
  }

  private async executeRetrieve(headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(
      `${this.client.baseUrl}/api/data/v9.2/${params.entity}${params.query || ''}`,
      { headers }
    );
    return response.json();
  }

  private async executeCreate(headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(
      `${this.client.baseUrl}/api/data/v9.2/${params.entity}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(params.data),
      }
    );
    return response.json();
  }

  private async executeUpdate(headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(
      `${this.client.baseUrl}/api/data/v9.2/${params.entity}(${params.id})`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(params.data),
      }
    );
    return response.status === 204;
  }

  private async executeDelete(headers: HeadersInit, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(
      `${this.client.baseUrl}/api/data/v9.2/${params.entity}(${params.id})`,
      {
        method: 'DELETE',
        headers,
      }
    );
    return response.status === 204;
  }
}