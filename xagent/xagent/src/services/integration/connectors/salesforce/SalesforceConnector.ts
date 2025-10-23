import type { IntegrationProvider, IntegrationConfig } from '../types';

export class SalesforceConnector implements IntegrationProvider {
  private client: any;
  private connected = false;
  private config: IntegrationConfig | null = null;

  async connect(config: IntegrationConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize Salesforce client with jsforce
      const jsforce = await import('jsforce');
      
      this.client = new jsforce.Connection({
        loginUrl: config.loginUrl || 'https://login.salesforce.com',
        version: config.version || '59.0'
      });

      // Authenticate with Salesforce
      if (config.username && config.password) {
        await this.client.login(config.username, config.password);
      } else if (config.accessToken) {
        this.client.accessToken = config.accessToken;
        this.client.instanceUrl = config.instanceUrl;
      } else {
        throw new Error('Salesforce authentication credentials not provided');
      }

      // Test connection
      const identity = await this.client.identity();
      console.log('✅ Connected to Salesforce as:', identity.display_name);
      
      this.connected = true;
    } catch (error) {
      console.error('❌ Failed to connect to Salesforce:', error);
      this.connected = false;
      throw new Error(`Salesforce connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.connected) {
        await this.client.logout();
      }
    } catch (error) {
      console.warn('Error during Salesforce logout:', error);
    } finally {
      this.client = null;
      this.connected = false;
      this.config = null;
    }
  }

  isConnected(): boolean {
    return this.connected && this.client;
  }

  async executeAction(action: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Salesforce');
    }

    switch (action) {
      case 'contacts.list':
        return this.listContacts(params);
      case 'contacts.create':
        return this.createContact(params);
      case 'contacts.update':
        return this.updateContact(params);
      case 'opportunities.list':
        return this.listOpportunities(params);
      case 'opportunities.create':
        return this.createOpportunity(params);
      case 'opportunities.update':
        return this.updateOpportunity(params);
      case 'leads.list':
        return this.listLeads(params);
      case 'leads.create':
        return this.createLead(params);
      case 'leads.update':
        return this.updateLead(params);
      case 'accounts.list':
        return this.listAccounts(params);
      case 'accounts.create':
        return this.createAccount(params);
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  private async listContacts(params: Record<string, unknown>): Promise<unknown> {
    try {
      const query = params.query || 'SELECT Id, Name, Email, Phone, Account.Name FROM Contact LIMIT 100';
      const result = await this.client.query(query);
      return result.records;
    } catch (error) {
      console.error('Failed to list contacts:', error);
      throw error;
    }
  }

  private async createContact(params: Record<string, unknown>): Promise<unknown> {
    try {
      const contactData = {
        FirstName: params.firstName,
        LastName: params.lastName,
        Email: params.email,
        Phone: params.phone,
        AccountId: params.accountId
      };

      const result = await this.client.sobject('Contact').create(contactData);
      return result;
    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }

  private async updateContact(params: Record<string, unknown>): Promise<unknown> {
    try {
      const contactId = params.id;
      const contactData = {
        FirstName: params.firstName,
        LastName: params.lastName,
        Email: params.email,
        Phone: params.phone
      };

      const result = await this.client.sobject('Contact').update({ Id: contactId, ...contactData });
      return result;
    } catch (error) {
      console.error('Failed to update contact:', error);
      throw error;
    }
  }

  private async listOpportunities(params: Record<string, unknown>): Promise<unknown> {
    try {
      const query = params.query || 'SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity LIMIT 100';
      const result = await this.client.query(query);
      return result.records;
    } catch (error) {
      console.error('Failed to list opportunities:', error);
      throw error;
    }
  }

  private async createOpportunity(params: Record<string, unknown>): Promise<unknown> {
    try {
      const opportunityData = {
        Name: params.name,
        Amount: params.amount,
        StageName: params.stage || 'Prospecting',
        CloseDate: params.closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        AccountId: params.accountId
      };

      const result = await this.client.sobject('Opportunity').create(opportunityData);
      return result;
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      throw error;
    }
  }

  private async updateOpportunity(params: Record<string, unknown>): Promise<unknown> {
    try {
      const opportunityId = params.id;
      const opportunityData = {
        Name: params.name,
        Amount: params.amount,
        StageName: params.stage,
        CloseDate: params.closeDate
      };

      const result = await this.client.sobject('Opportunity').update({ Id: opportunityId, ...opportunityData });
      return result;
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      throw error;
    }
  }

  private async listLeads(params: Record<string, unknown>): Promise<unknown> {
    try {
      const query = params.query || 'SELECT Id, FirstName, LastName, Company, Email, Phone, Status FROM Lead LIMIT 100';
      const result = await this.client.query(query);
      return result.records;
    } catch (error) {
      console.error('Failed to list leads:', error);
      throw error;
    }
  }

  private async createLead(params: Record<string, unknown>): Promise<unknown> {
    try {
      const leadData = {
        FirstName: params.firstName,
        LastName: params.lastName,
        Company: params.company,
        Email: params.email,
        Phone: params.phone,
        Status: params.status || 'Open - Not Contacted'
      };

      const result = await this.client.sobject('Lead').create(leadData);
      return result;
    } catch (error) {
      console.error('Failed to create lead:', error);
      throw error;
    }
  }

  private async updateLead(params: Record<string, unknown>): Promise<unknown> {
    try {
      const leadId = params.id;
      const leadData = {
        FirstName: params.firstName,
        LastName: params.lastName,
        Company: params.company,
        Email: params.email,
        Phone: params.phone,
        Status: params.status
      };

      const result = await this.client.sobject('Lead').update({ Id: leadId, ...leadData });
      return result;
    } catch (error) {
      console.error('Failed to update lead:', error);
      throw error;
    }
  }

  private async listAccounts(params: Record<string, unknown>): Promise<unknown> {
    try {
      const query = params.query || 'SELECT Id, Name, Type, Industry, Phone, Website FROM Account LIMIT 100';
      const result = await this.client.query(query);
      return result.records;
    } catch (error) {
      console.error('Failed to list accounts:', error);
      throw error;
    }
  }

  private async createAccount(params: Record<string, unknown>): Promise<unknown> {
    try {
      const accountData = {
        Name: params.name,
        Type: params.type,
        Industry: params.industry,
        Phone: params.phone,
        Website: params.website
      };

      const result = await this.client.sobject('Account').create(accountData);
      return result;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  }
}