/**
 * Payroll System Connector (ADP, Gusto compatible)
 * Handles payroll integrations
 */

import { APIConnector, type APICredentials, type APIResponse } from './base/APIConnector';

export interface PayrollEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  ssn?: string;
  dateOfBirth?: string;
}

export interface PayrollSetup {
  employeeId: string;
  salary: number;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  bankAccount: {
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
  };
  taxWithholding: {
    federalAllowances: number;
    stateAllowances?: number;
    additionalWithholding?: number;
  };
  startDate: string;
}

export interface PayrollRun {
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  employeeIds?: string[];
}

export class PayrollConnector extends APIConnector {
  private provider: 'adp' | 'gusto' | 'generic';

  constructor(credentials: APICredentials, provider: 'adp' | 'gusto' | 'generic' = 'generic') {
    const baseURL = provider === 'gusto'
      ? 'https://api.gusto.com/v1'
      : provider === 'adp'
      ? 'https://api.adp.com'
      : credentials.domain || 'https://api.example.com';
    
    super(credentials, baseURL);
    this.provider = provider;
  }

  async connect(): Promise<boolean> {
    try {
      const testResult = await this.testConnection();
      this.isConnected = testResult;
      return testResult;
    } catch (error) {
      console.error('Payroll system connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    const result = await this.getCompanyInfo();
    return result.success;
  }

  /**
   * Add employee to payroll system
   */
  async addEmployee(employee: PayrollEmployee): Promise<APIResponse<any>> {
    console.log('💼 Adding employee to payroll:', employee.email);

    if (!this.isConnected) {
      await this.connect();
    }

    return this.retryRequest(async () => {
      if (this.provider === 'gusto') {
        return await this.makeRequest('/companies/{company_id}/employees', {
          method: 'POST',
          body: {
            first_name: employee.firstName,
            last_name: employee.lastName,
            email: employee.email,
            ssn: employee.ssn,
            date_of_birth: employee.dateOfBirth,
          },
        });
      } else {
        return await this.makeRequest('/api/employees', {
          method: 'POST',
          body: employee,
        });
      }
    });
  }

  /**
   * Setup payroll for employee
   */
  async setupEmployeePayroll(setup: PayrollSetup): Promise<APIResponse<any>> {
    console.log('💰 Setting up payroll for employee:', setup.employeeId);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(`/api/employees/${setup.employeeId}/payroll`, {
      method: 'POST',
      body: {
        salary: setup.salary,
        payFrequency: setup.payFrequency,
        bankAccount: setup.bankAccount,
        taxWithholding: setup.taxWithholding,
        effectiveDate: setup.startDate,
      },
    });
  }

  /**
   * Run payroll
   */
  async runPayroll(payrollRun: PayrollRun): Promise<APIResponse<any>> {
    console.log('🏃 Running payroll for period:', payrollRun.payPeriodStart, 'to', payrollRun.payPeriodEnd);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest('/api/payroll/run', {
      method: 'POST',
      body: payrollRun,
    });
  }

  /**
   * Get employee payroll information
   */
  async getEmployeePayroll(employeeId: string): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(`/api/employees/${employeeId}/payroll`, {
      method: 'GET',
    });
  }

  /**
   * Get pay stubs
   */
  async getPayStubs(employeeId: string, year?: number): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    const params = year ? { year: year.toString() } : {};

    return await this.makeRequest(`/api/employees/${employeeId}/pay_stubs`, {
      method: 'GET',
      params,
    });
  }

  /**
   * Update tax withholding
   */
  async updateTaxWithholding(
    employeeId: string,
    taxInfo: Record<string, any>
  ): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest(`/api/employees/${employeeId}/tax_withholding`, {
      method: 'PUT',
      body: taxInfo,
    });
  }

  /**
   * Get company information
   */
  private async getCompanyInfo(): Promise<APIResponse<any>> {
    return await this.makeRequest('/api/company', {
      method: 'GET',
    });
  }
}

