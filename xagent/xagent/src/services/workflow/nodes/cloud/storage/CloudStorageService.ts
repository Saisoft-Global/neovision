import { CloudServiceConfig } from '../types';
import { CloudNodeExecutor } from '../CloudNodeExecutor';

export class CloudStorageService {
  private executor: CloudNodeExecutor;

  constructor() {
    this.executor = new CloudNodeExecutor();
  }

  async uploadFile(
    provider: CloudServiceConfig['provider'],
    bucket: string,
    key: string,
    content: Buffer | string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const config: CloudServiceConfig = {
      provider,
      service: 'storage',
      operation: 'upload',
      parameters: {
        Bucket: bucket,
        Key: key,
        Body: content,
        ...options,
      },
      credentials: this.getCredentialsForProvider(provider),
    };

    return this.executor.execute(config);
  }

  async downloadFile(
    provider: CloudServiceConfig['provider'],
    bucket: string,
    key: string
  ): Promise<Buffer> {
    const config: CloudServiceConfig = {
      provider,
      service: 'storage',
      operation: 'download',
      parameters: {
        Bucket: bucket,
        Key: key,
      },
      credentials: this.getCredentialsForProvider(provider),
    };

    return this.executor.execute(config) as Promise<Buffer>;
  }

  async listFiles(
    provider: CloudServiceConfig['provider'],
    bucket: string,
    prefix?: string
  ): Promise<string[]> {
    const config: CloudServiceConfig = {
      provider,
      service: 'storage',
      operation: 'list',
      parameters: {
        Bucket: bucket,
        Prefix: prefix,
      },
      credentials: this.getCredentialsForProvider(provider),
    };

    return this.executor.execute(config) as Promise<string[]>;
  }

  private getCredentialsForProvider(provider: CloudServiceConfig['provider']) {
    // Get credentials from environment variables or configuration
    switch (provider) {
      case 'aws':
        return {
          provider,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
        };
      case 'azure':
        return {
          provider,
          tenantId: process.env.AZURE_TENANT_ID,
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
        };
      case 'gcp':
        return {
          provider,
          projectId: process.env.GCP_PROJECT_ID,
          clientId: process.env.GCP_CLIENT_ID,
          clientSecret: process.env.GCP_CLIENT_SECRET,
        };
      default:
        throw new Error(`Unsupported cloud provider: ${provider}`);
    }
  }
}