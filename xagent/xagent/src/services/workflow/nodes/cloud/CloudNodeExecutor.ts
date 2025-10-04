import { NodeExecutor } from '../executors/NodeExecutor';
import { CloudServiceConfig, CloudServiceConnector } from './types';
import { AWSConnector } from './connectors/AWSConnector';
import { AzureConnector } from './connectors/AzureConnector';
import { GCPConnector } from './connectors/GCPConnector';

export class CloudNodeExecutor extends NodeExecutor<CloudServiceConfig> {
  private connectors: Map<string, CloudServiceConnector>;

  constructor() {
    super();
    this.connectors = new Map();
    this.registerConnectors();
  }

  private registerConnectors() {
    this.connectors.set('aws', new AWSConnector());
    this.connectors.set('azure', new AzureConnector());
    this.connectors.set('gcp', new GCPConnector());
  }

  async execute(config: CloudServiceConfig): Promise<unknown> {
    const connector = this.connectors.get(config.provider);
    if (!connector) {
      throw new Error(`No connector found for provider: ${config.provider}`);
    }

    try {
      if (!connector.isConnected()) {
        await connector.connect(config.credentials);
      }

      return await connector.executeOperation(
        config.service,
        config.operation,
        config.parameters
      );
    } catch (error) {
      console.error('Cloud operation error:', error);
      throw error;
    }
  }
}