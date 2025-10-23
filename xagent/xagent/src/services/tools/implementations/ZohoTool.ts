/**
 * Zoho Integration Tool
 * Supports: Invoices, CRM, Books, Inventory
 */

import type { Tool, ToolSkill, ToolExecutionContext, ToolExecutionResult } from '../types';

class ZohoToolClass implements Tool {
  id = 'zoho-integration';
  name = 'Zoho Tool';
  description = 'Integration with Zoho services (Books, CRM, Inventory)';
  category = 'integration' as const;
  provider = 'zoho';
  version = '1.0.0';
  isActive = true;
  requiresAuth = true;

  // Zoho API Configuration
  private zohoConfig = {
    apiEndpoint: import.meta.env.VITE_ZOHO_API_ENDPOINT || 'https://www.zohoapis.com',
    organizationId: import.meta.env.VITE_ZOHO_ORGANIZATION_ID || '',
    clientId: import.meta.env.VITE_ZOHO_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_ZOHO_CLIENT_SECRET || '',
    refreshToken: import.meta.env.VITE_ZOHO_REFRESH_TOKEN || '',
  };

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get or refresh Zoho access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Refresh the token
    const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
    const params = new URLSearchParams({
      refresh_token: this.zohoConfig.refreshToken,
      client_id: this.zohoConfig.clientId,
      client_secret: this.zohoConfig.clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Zoho access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  /**
   * Make authenticated request to Zoho API
   */
  private async zohoRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.zohoConfig.apiEndpoint}${endpoint}`;

    const headers: HeadersInit = {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoho API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Skill 1: Extract Invoice Data from Document
   */
  private async extractInvoiceData(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters, llmService } = context;
    const documentText = parameters.documentText || parameters.text;

    if (!documentText) {
      return {
        success: false,
        error: 'No document text provided',
      };
    }

    // Use LLM to extract structured invoice data
    const prompt = `Extract invoice information from the following text and return it as JSON with these fields:
- customer_name
- customer_email (if available)
- customer_address (if available)
- invoice_date
- due_date (if available)
- items (array of {item_name, description, quantity, rate, amount})
- subtotal
- tax_amount (if available)
- total_amount
- currency (default: USD)
- notes (any additional information)

Text:
${documentText}

Return ONLY valid JSON, no explanation.`;

    try {
      const response = await llmService.generateText(prompt);
      const invoiceData = JSON.parse(response);

      return {
        success: true,
        data: invoiceData,
        message: 'Invoice data extracted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract invoice data: ${error}`,
      };
    }
  }

  /**
   * Skill 2: Create Invoice in Zoho Books
   */
  private async createZohoInvoice(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const invoiceData = parameters.invoiceData || parameters;

    // Format data for Zoho Books API
    const zohoInvoice = {
      customer_name: invoiceData.customer_name,
      customer_email: invoiceData.customer_email,
      date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date,
      line_items: invoiceData.items?.map((item: any) => ({
        name: item.item_name,
        description: item.description,
        quantity: item.quantity || 1,
        rate: item.rate || item.amount,
        item_order: 0,
      })) || [],
      notes: invoiceData.notes || '',
      currency_code: invoiceData.currency || 'USD',
      organization_id: this.zohoConfig.organizationId,
    };

    try {
      const result = await this.zohoRequest(
        '/books/v3/invoices',
        'POST',
        zohoInvoice
      );

      return {
        success: true,
        data: result.invoice,
        message: `Invoice created successfully: ${result.invoice.invoice_number}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create Zoho invoice: ${error}`,
      };
    }
  }

  /**
   * Skill 3: Create or Update Customer in Zoho Books
   */
  private async manageZohoCustomer(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const customerData = parameters.customerData || parameters;

    const zohoCustomer = {
      contact_name: customerData.customer_name || customerData.name,
      contact_type: 'customer',
      email: customerData.customer_email || customerData.email,
      billing_address: {
        address: customerData.customer_address || customerData.address,
      },
      organization_id: this.zohoConfig.organizationId,
    };

    try {
      // Try to find existing customer first
      const searchResult = await this.zohoRequest(
        `/books/v3/contacts?contact_name=${encodeURIComponent(zohoCustomer.contact_name)}`,
        'GET'
      );

      if (searchResult.contacts && searchResult.contacts.length > 0) {
        // Update existing customer
        const customerId = searchResult.contacts[0].contact_id;
        const result = await this.zohoRequest(
          `/books/v3/contacts/${customerId}`,
          'PUT',
          zohoCustomer
        );

        return {
          success: true,
          data: result.contact,
          message: `Customer updated: ${result.contact.contact_name}`,
        };
      } else {
        // Create new customer
        const result = await this.zohoRequest(
          '/books/v3/contacts',
          'POST',
          zohoCustomer
        );

        return {
          success: true,
          data: result.contact,
          message: `Customer created: ${result.contact.contact_name}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to manage Zoho customer: ${error}`,
      };
    }
  }

  /**
   * Skill 4: Get Invoice Status
   */
  private async getInvoiceStatus(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const invoiceId = parameters.invoice_id || parameters.invoiceId;

    if (!invoiceId) {
      return {
        success: false,
        error: 'Invoice ID is required',
      };
    }

    try {
      const result = await this.zohoRequest(`/books/v3/invoices/${invoiceId}`, 'GET');

      return {
        success: true,
        data: result.invoice,
        message: `Invoice status: ${result.invoice.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get invoice status: ${error}`,
      };
    }
  }

  /**
   * Skill 5: Complete Workflow - Document to Invoice
   */
  private async documentToInvoice(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    
    try {
      // Step 1: Extract invoice data from document
      console.log('📄 Step 1: Extracting invoice data from document...');
      const extractResult = await this.extractInvoiceData(context);
      if (!extractResult.success) {
        return extractResult;
      }

      const invoiceData = extractResult.data;
      console.log('✅ Invoice data extracted:', invoiceData);

      // Step 2: Create/update customer
      console.log('👤 Step 2: Managing customer in Zoho...');
      const customerResult = await this.manageZohoCustomer({
        ...context,
        parameters: { customerData: invoiceData },
      });
      
      if (!customerResult.success) {
        console.warn('⚠️ Customer management failed, continuing with invoice creation');
      }

      // Step 3: Create invoice in Zoho
      console.log('💰 Step 3: Creating invoice in Zoho Books...');
      const invoiceResult = await this.createZohoInvoice({
        ...context,
        parameters: { invoiceData },
      });

      if (!invoiceResult.success) {
        return invoiceResult;
      }

      return {
        success: true,
        data: {
          extracted_data: invoiceData,
          customer: customerResult.data,
          invoice: invoiceResult.data,
        },
        message: `✅ Complete! Document processed and invoice ${invoiceResult.data.invoice_number} created in Zoho Books`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Workflow failed: ${error}`,
      };
    }
  }

  /**
   * Skill 6: Search Invoices (for clients/suppliers checking status)
   */
  private async searchInvoices(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const {
      customer_name,
      invoice_number,
      status,
      date_from,
      date_to,
    } = parameters;

    try {
      let queryParams = new URLSearchParams();
      
      if (customer_name) queryParams.append('customer_name', customer_name);
      if (invoice_number) queryParams.append('invoice_number', invoice_number);
      if (status) queryParams.append('status', status);
      if (date_from) queryParams.append('date_start', date_from);
      if (date_to) queryParams.append('date_end', date_to);

      const result = await this.zohoRequest(
        `/books/v3/invoices?${queryParams.toString()}`,
        'GET'
      );

      return {
        success: true,
        data: result.invoices,
        message: `Found ${result.invoices?.length || 0} invoice(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search invoices: ${error}`,
      };
    }
  }

  /**
   * Skill 7: Update Invoice Status
   */
  private async updateInvoiceStatus(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const { invoice_id, action } = parameters;

    if (!invoice_id || !action) {
      return {
        success: false,
        error: 'Invoice ID and action are required',
      };
    }

    try {
      let endpoint = '';
      switch (action.toLowerCase()) {
        case 'send':
          endpoint = `/books/v3/invoices/${invoice_id}/status/sent`;
          break;
        case 'void':
          endpoint = `/books/v3/invoices/${invoice_id}/status/void`;
          break;
        case 'mark_sent':
          endpoint = `/books/v3/invoices/${invoice_id}/status/sent`;
          break;
        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Use: send, void, or mark_sent`,
          };
      }

      const result = await this.zohoRequest(endpoint, 'POST');

      return {
        success: true,
        data: result.invoice,
        message: `Invoice ${action} successful`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update invoice status: ${error}`,
      };
    }
  }

  /**
   * Skill 8: Send Invoice Email
   */
  private async sendInvoiceEmail(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const { invoice_id, email_addresses, subject, body } = parameters;

    if (!invoice_id) {
      return {
        success: false,
        error: 'Invoice ID is required',
      };
    }

    try {
      const emailData = {
        send_from_org_email_id: true,
        to_mail_ids: email_addresses || [],
        subject: subject || 'Invoice from ${organization_name}',
        body: body || 'Please find the attached invoice.',
      };

      const result = await this.zohoRequest(
        `/books/v3/invoices/${invoice_id}/email`,
        'POST',
        emailData
      );

      return {
        success: true,
        data: result,
        message: 'Invoice email sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send invoice email: ${error}`,
      };
    }
  }

  /**
   * Skill 9: Get Payment History
   */
  private async getPaymentHistory(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters } = context;
    const { invoice_id, customer_id } = parameters;

    try {
      let endpoint = '/books/v3/customerpayments';
      if (invoice_id) {
        endpoint = `/books/v3/invoices/${invoice_id}/payments`;
      } else if (customer_id) {
        endpoint = `/books/v3/customerpayments?customer_id=${customer_id}`;
      }

      const result = await this.zohoRequest(endpoint, 'GET');

      return {
        success: true,
        data: result.customerpayments || result.payments,
        message: `Found ${(result.customerpayments || result.payments || []).length} payment(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get payment history: ${error}`,
      };
    }
  }

  /**
   * Skill 10: Natural Language Query Handler
   * This skill interprets natural language questions about invoices
   */
  private async handleNaturalQuery(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { parameters, llmService } = context;
    const query = parameters.query || parameters.question;

    if (!query) {
      return {
        success: false,
        error: 'Query or question is required',
      };
    }

    try {
      // Use LLM to extract intent and parameters
      const intentPrompt = `Analyze this query about invoices and extract the action and parameters:
"${query}"

Return JSON with:
{
  "action": "search" | "status" | "payment" | "send",
  "parameters": {
    "customer_name": string (if mentioned),
    "invoice_number": string (if mentioned),
    "status": string (if mentioned),
    "time_period": string (if mentioned)
  }
}

Return ONLY valid JSON.`;

      const intentResponse = await llmService.generateText(intentPrompt);
      const intent = JSON.parse(intentResponse);

      // Execute the appropriate skill based on intent
      switch (intent.action) {
        case 'search':
          return await this.searchInvoices({ ...context, parameters: intent.parameters });
        case 'status':
          if (intent.parameters.invoice_number) {
            // Get specific invoice by number first
            const searchResult = await this.searchInvoices({
              ...context,
              parameters: { invoice_number: intent.parameters.invoice_number },
            });
            if (searchResult.success && searchResult.data.length > 0) {
              return await this.getInvoiceStatus({
                ...context,
                parameters: { invoice_id: searchResult.data[0].invoice_id },
              });
            }
          }
          return { success: false, error: 'Invoice not found' };
        case 'payment':
          return await this.getPaymentHistory({ ...context, parameters: intent.parameters });
        default:
          return {
            success: false,
            error: `Could not understand query: ${query}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to process natural query: ${error}`,
      };
    }
  }

  /**
   * Tool Skills Definition
   */
  skills: ToolSkill[] = [
    {
      id: 'extract_invoice_data',
      name: 'extract_invoice_data',
      description: 'Extract structured invoice data from document text using AI',
      parameters: {
        documentText: { type: 'string', required: true, description: 'Raw text from the document' },
      },
      execute: this.extractInvoiceData.bind(this),
    },
    {
      id: 'create_zoho_invoice',
      name: 'create_zoho_invoice',
      description: 'Create a new invoice in Zoho Books',
      parameters: {
        invoiceData: { type: 'object', required: true, description: 'Invoice data structure' },
      },
      execute: this.createZohoInvoice.bind(this),
    },
    {
      id: 'manage_zoho_customer',
      name: 'manage_zoho_customer',
      description: 'Create or update a customer in Zoho Books',
      parameters: {
        customerData: { type: 'object', required: true, description: 'Customer data' },
      },
      execute: this.manageZohoCustomer.bind(this),
    },
    {
      id: 'get_invoice_status',
      name: 'get_invoice_status',
      description: 'Get the status of a Zoho invoice',
      parameters: {
        invoice_id: { type: 'string', required: true, description: 'Zoho invoice ID' },
      },
      execute: this.getInvoiceStatus.bind(this),
    },
    {
      id: 'document_to_invoice',
      name: 'document_to_invoice',
      description: 'Complete workflow: Upload document → Extract data → Create invoice in Zoho',
      parameters: {
        documentText: { type: 'string', required: true, description: 'Raw text from uploaded document' },
        autoCreate: { type: 'boolean', required: false, description: 'Auto-create without confirmation' },
      },
      execute: this.documentToInvoice.bind(this),
    },
    {
      id: 'search_invoices',
      name: 'search_invoices',
      description: 'Search for invoices by customer name, invoice number, status, or date range',
      parameters: {
        customer_name: { type: 'string', required: false, description: 'Customer name to search for' },
        invoice_number: { type: 'string', required: false, description: 'Invoice number to search for' },
        status: { type: 'string', required: false, description: 'Invoice status (paid, unpaid, overdue, etc.)' },
        date_from: { type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', required: false, description: 'End date (YYYY-MM-DD)' },
      },
      execute: this.searchInvoices.bind(this),
    },
    {
      id: 'update_invoice_status',
      name: 'update_invoice_status',
      description: 'Update invoice status (send, void, mark as sent)',
      parameters: {
        invoice_id: { type: 'string', required: true, description: 'Zoho invoice ID' },
        action: { type: 'string', required: true, description: 'Action: send, void, or mark_sent' },
      },
      execute: this.updateInvoiceStatus.bind(this),
    },
    {
      id: 'send_invoice_email',
      name: 'send_invoice_email',
      description: 'Send invoice via email to customer or specified recipients',
      parameters: {
        invoice_id: { type: 'string', required: true, description: 'Zoho invoice ID' },
        email_addresses: { type: 'array', required: false, description: 'Email addresses to send to' },
        subject: { type: 'string', required: false, description: 'Email subject' },
        body: { type: 'string', required: false, description: 'Email body' },
      },
      execute: this.sendInvoiceEmail.bind(this),
    },
    {
      id: 'get_payment_history',
      name: 'get_payment_history',
      description: 'Get payment history for an invoice or customer',
      parameters: {
        invoice_id: { type: 'string', required: false, description: 'Zoho invoice ID' },
        customer_id: { type: 'string', required: false, description: 'Zoho customer ID' },
      },
      execute: this.getPaymentHistory.bind(this),
    },
    {
      id: 'handle_natural_query',
      name: 'handle_natural_query',
      description: 'Handle natural language questions about invoices (e.g., "What\'s the status of invoice INV-001?")',
      parameters: {
        query: { type: 'string', required: true, description: 'Natural language question about invoices' },
      },
      execute: this.handleNaturalQuery.bind(this),
    },
  ];

  async execute(skillName: string, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const skill = this.skills.find(s => s.name === skillName);
    if (!skill) {
      return {
        success: false,
        error: `Skill '${skillName}' not found in Zoho Tool`,
      };
    }

    return skill.execute(context);
  }

  async validateAuth(credentials: Record<string, any>): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.getAccessToken();
      const result = await this.zohoRequest('/books/v3/organizations', 'GET');
      return {
        success: true,
        message: `Connected to Zoho Books: ${result.organizations?.[0]?.name || 'Unknown'}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Zoho: ${error}`,
      };
    }
  }
}

// Export instance to match EmailTool and CRMTool pattern
const zohoToolInstance = new ZohoToolClass();

export const ZohoTool: Tool = {
  id: zohoToolInstance.id,
  name: zohoToolInstance.name,
  description: zohoToolInstance.description,
  category: zohoToolInstance.category,
  provider: zohoToolInstance.provider,
  version: zohoToolInstance.version,
  isActive: zohoToolInstance.isActive,
  requiresAuth: zohoToolInstance.requiresAuth,
  skills: zohoToolInstance.skills,
  execute: zohoToolInstance.execute.bind(zohoToolInstance),
  validateAuth: zohoToolInstance.validateAuth.bind(zohoToolInstance),
  testConnection: zohoToolInstance.testConnection.bind(zohoToolInstance),
};

