/**
 * Salesforce API Connector
 * Handles Salesforce CRM integrations
 */

import { APIConnector, type APICredentials, type APIResponse } from './base/APIConnector';

export interface SalesforceLead {
  FirstName: string;
  LastName: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Status?: string;
  LeadSource?: string;
  Description?: string;
}

export interface SalesforceOpportunity {
  Name: string;
  StageName: string;
  CloseDate: string;
  Amount?: number;
  AccountId?: string;
  Description?: string;
}

export interface SalesforceContact {
  FirstName: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  AccountId?: string;
}

export class SalesforceConnector extends APIConnector {
  private instanceUrl: string = '';
  private apiVersion: string = 'v59.0';

  constructor(credentials: APICredentials) {
    const domain = credentials.domain || 'login.salesforce.com';
    super(credentials, `https://${domain}`);
  }

  async connect(): Promise<boolean> {
    try {
      // Authenticate with Salesforce
      const authResult = await this.authenticate();
      
      if (authResult.success && authResult.data) {
        this.instanceUrl = authResult.data.instance_url;
        this.credentials.accessToken = authResult.data.access_token;
        this.isConnected = true;
        console.log('✅ Connected to Salesforce:', this.instanceUrl);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Salesforce connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.instanceUrl = '';
    this.credentials.accessToken = undefined;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConnected) {
      return this.connect();
    }

    // Test with a simple query
    const result = await this.query('SELECT Id FROM User LIMIT 1');
    return result.success;
  }

  /**
   * OAuth authentication
   */
  private async authenticate(): Promise<APIResponse<any>> {
    const tokenEndpoint = '/services/oauth2/token';

    return await this.makeRequest(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: this.credentials.clientId || '',
        client_secret: this.credentials.clientSecret || '',
        username: this.credentials.username || '',
        password: this.credentials.password || '',
      }).toString(),
    });
  }

  /**
   * Create a lead in Salesforce
   */
  async createLead(lead: SalesforceLead): Promise<APIResponse<any>> {
    console.log('🎯 Creating Salesforce lead:', lead.Company);

    if (!this.isConnected) {
      await this.connect();
    }

    return this.retryRequest(async () => {
      return await this.makeRequest(
        `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Lead`,
        {
          method: 'POST',
          body: {
            ...lead,
            Status: lead.Status || 'Open - Not Contacted',
            LeadSource: lead.LeadSource || 'AI Agent',
          },
        }
      );
    });
  }

  /**
   * Create an opportunity
   */
  async createOpportunity(opportunity: SalesforceOpportunity): Promise<APIResponse<any>> {
    console.log('💼 Creating Salesforce opportunity:', opportunity.Name);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(
      `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Opportunity`,
      {
        method: 'POST',
        body: opportunity,
      }
    );
  }

  /**
   * Create a contact
   */
  async createContact(contact: SalesforceContact): Promise<APIResponse<any>> {
    console.log('👤 Creating Salesforce contact:', contact.Email);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(
      `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Contact`,
      {
        method: 'POST',
        body: contact,
      }
    );
  }

  /**
   * Execute SOQL query
   */
  async query(soql: string): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(
      `${this.instanceUrl}/services/data/${this.apiVersion}/query`,
      {
        method: 'GET',
        params: { q: soql },
      }
    );
  }

  /**
   * Update a record
   */
  async updateRecord(
    objectType: string,
    recordId: string,
    updates: Record<string, any>
  ): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(
      `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${objectType}/${recordId}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );
  }

  /**
   * Search records
   */
  async search(searchQuery: string): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(
      `${this.instanceUrl}/services/data/${this.apiVersion}/search`,
      {
        method: 'GET',
        params: { q: searchQuery },
      }
    );
  }

  /**
   * Get recent items
   */
  async getRecentItems(objectType: string = 'Lead'): Promise<APIResponse<any>> {
    const soql = `SELECT Id, Name, CreatedDate FROM ${objectType} ORDER BY CreatedDate DESC LIMIT 10`;
    return await this.query(soql);
  }
}

