import { CloudServiceConnector, CloudCredentials } from '../types';

export class AWSConnector implements CloudServiceConnector {
  private client: any = null;
  private services: Map<string, any> = new Map();

  async connect(credentials: CloudCredentials): Promise<void> {
    try {
      // Initialize AWS SDK
      const AWS = await import('aws-sdk');
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region,
      });
      this.client = AWS;
    } catch (error) {
      console.error('AWS connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.services.clear();
  }

  async executeOperation(service: string, operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to AWS');
    }

    const serviceClient = await this.getServiceClient(service);
    if (!serviceClient[operation]) {
      throw new Error(`Operation ${operation} not found for service ${service}`);
    }

    return new Promise((resolve, reject) => {
      serviceClient[operation](params, (err: Error, data: unknown) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  isConnected(): boolean {
    return Boolean(this.client);
  }

  private async getServiceClient(service: string): Promise<any> {
    if (!this.services.has(service)) {
      this.services.set(service, new this.client[service]());
    }
    return this.services.get(service);
  }
}