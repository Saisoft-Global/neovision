import { NodeExecutor } from '../executors/NodeExecutor';
import { CommunicationConfig, CommunicationConnector } from './types';
import { EmailConnector } from './connectors/EmailConnector';
import { SlackConnector } from './connectors/SlackConnector';
import { TeamsConnector } from './connectors/TeamsConnector';
import { SMSConnector } from './connectors/SMSConnector';
import { WhatsAppConnector } from './connectors/WhatsAppConnector';

export class CommunicationNodeExecutor extends NodeExecutor<CommunicationConfig> {
  private connectors: Map<string, CommunicationConnector>;

  constructor() {
    super();
    this.connectors = new Map();
    this.registerConnectors();
  }

  private registerConnectors() {
    this.connectors.set('email', new EmailConnector());
    this.connectors.set('slack', new SlackConnector());
    this.connectors.set('teams', new TeamsConnector());
    this.connectors.set('sms', new SMSConnector());
    this.connectors.set('whatsapp', new WhatsAppConnector());
  }

  async execute(config: CommunicationConfig): Promise<unknown> {
    const connector = this.connectors.get(config.type);
    if (!connector) {
      throw new Error(`No connector found for type: ${config.type}`);
    }

    try {
      if (!connector.isConnected()) {
        await connector.connect(config.credentials);
      }

      return await connector.send(config.parameters);
    } catch (error) {
      console.error('Communication operation error:', error);
      throw error;
    }
  }
}