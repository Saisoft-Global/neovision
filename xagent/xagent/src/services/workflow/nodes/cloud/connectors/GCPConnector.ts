import { CloudServiceConnector, CloudCredentials } from '../types';

export class GCPConnector implements CloudServiceConnector {
  private client: any = null;
  private projectId: string | null = null;

  async connect(credentials: CloudCredentials): Promise<void> {
    try {
      const { GoogleAuth } = await import('google-auth-library');
      this.client = new GoogleAuth({
        credentials: {
          client_email: credentials.clientId,
          private_key: credentials.clientSecret,
        },
        projectId: credentials.projectId,
      });
      this.projectId = credentials.projectId!;
    } catch (error) {
      console.error('GCP connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.projectId = null;
  }

  async executeOperation(service: string, operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to GCP');
    }

    try {
      const serviceClient = await this.getServiceClient(service);
      return await serviceClient[operation](params);
    } catch (error) {
      console.error('GCP operation error:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return Boolean(this.client && this.projectId);
  }

  private async getServiceClient(service: string): Promise<any> {
    switch (service) {
      case 'storage':
        const { Storage } = await import('@google-cloud/storage');
        return new Storage({ projectId: this.projectId });
      case 'bigquery':
        const { BigQuery } = await import('@google-cloud/bigquery');
        return new BigQuery({ projectId: this.projectId });
      // Add more GCP services as needed
      default:
        throw new Error(`Unsupported GCP service: ${service}`);
    }
  }
}