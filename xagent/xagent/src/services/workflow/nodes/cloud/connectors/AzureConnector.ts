import { CloudServiceConnector, CloudCredentials } from '../types';

export class AzureConnector implements CloudServiceConnector {
  private client: any = null;
  private credentials: CloudCredentials | null = null;

  async connect(credentials: CloudCredentials): Promise<void> {
    try {
      const { DefaultAzureCredential } = await import('@azure/identity');
      this.credentials = credentials;
      this.client = new DefaultAzureCredential();
    } catch (error) {
      console.error('Azure connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.credentials = null;
  }

  async executeOperation(service: string, operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Azure');
    }

    try {
      const serviceClient = await this.getServiceClient(service);
      return await serviceClient[operation](params);
    } catch (error) {
      console.error('Azure operation error:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return Boolean(this.client && this.credentials);
  }

  private async getServiceClient(service: string): Promise<any> {
    switch (service) {
      case 'storage':
        const { BlobServiceClient } = await import('@azure/storage-blob');
        return BlobServiceClient.fromConnectionString(this.credentials!.clientSecret!);
      case 'keyvault':
        const { KeyClient } = await import('@azure/keyvault-keys');
        return new KeyClient(this.credentials!.clientSecret!, this.client);
      // Add more Azure services as needed
      default:
        throw new Error(`Unsupported Azure service: ${service}`);
    }
  }
}