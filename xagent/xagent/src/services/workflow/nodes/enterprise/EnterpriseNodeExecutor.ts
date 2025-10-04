import { NodeExecutor } from '../executors/NodeExecutor';
import { EnterpriseConfig, EnterpriseConnector } from './types';
import { SAPConnector } from './connectors/SAPConnector';
import { SalesforceConnector } from './connectors/SalesforceConnector';
import { DynamicsConnector } from './connectors/DynamicsConnector';

export class EnterpriseNodeExecutor extends NodeExecutor<EnterpriseConfig> {
  private connectors: Map<string, EnterpriseConnector>;

  constructor() {
    super();
    this.connectors = new Map();
    this.registerConnectors();
  }

  private registerConnectors() {
    this.connectors.set('sap', new SAPConnector());
    this.connectors.set('salesforce', new SalesforceConnector());
    this.connectors.set('dynamics', new DynamicsConnector());
  }

  async execute(config: EnterpriseConfig): Promise<unknown> {
    const connector = this.connectors.get(config.system);
    if (!connector) {
      throw new Error(`No connector found for system: ${config.system}`);
    }

    try {
      if (!connector.isConnected()) {
        await connector.connect(config.credentials);
      }

      return await connector.execute(config.operation, {
        entity: config.entity,
        action: config.action,
        ...config.parameters,
      });
    } catch (error) {
      console.error('Enterprise system operation error:', error);
      throw error;
    }
  }
}