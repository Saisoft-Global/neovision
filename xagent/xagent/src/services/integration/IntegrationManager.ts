import type { IntegrationConfig, IntegrationProvider } from './connectors/types';
import { MSGraphConnector } from './connectors/microsoft/MSGraphConnector';
import { SalesforceConnector } from './connectors/salesforce/SalesforceConnector';

export class IntegrationManager {
  private static instance: IntegrationManager;
  private connectors: Map<string, IntegrationProvider>;

  private constructor() {
    this.connectors = new Map();
    this.initializeConnectors();
  }

  public static getInstance(): IntegrationManager {
    if (!this.instance) {
      this.instance = new IntegrationManager();
    }
    return this.instance;
  }

  private initializeConnectors(): void {
    this.connectors.set('microsoft365', new MSGraphConnector());
    this.connectors.set('salesforce', new SalesforceConnector());
  }

  async connect(type: string, config: IntegrationConfig): Promise<void> {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new Error(`Unsupported integration type: ${type}`);
    }

    await connector.connect(config);
  }

  async executeAction(
    type: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new Error(`Unsupported integration type: ${type}`);
    }

    if (!connector.isConnected()) {
      throw new Error(`Not connected to ${type}`);
    }

    return connector.executeAction(action, params);
  }
}