/**
 * HR System API Connector (Workday, BambooHR compatible)
 * Handles HR system integrations for employee management
 */

import { APIConnector, type APICredentials, type APIResponse } from './base/APIConnector';

export interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  manager?: string;
  startDate?: string;
  salary?: number;
  employmentType?: 'full_time' | 'part_time' | 'contractor';
  location?: string;
}

export interface LeaveRequest {
  employeeId: string;
  leaveType: 'vacation' | 'sick' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface PayrollInfo {
  employeeId: string;
  salary: number;
  payFrequency: 'weekly' | 'biweekly' | 'monthly';
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
  };
  taxInfo?: Record<string, any>;
}

export class HRSystemConnector extends APIConnector {
  private systemType: 'workday' | 'bamboohr' | 'generic';

  constructor(credentials: APICredentials, systemType: 'workday' | 'bamboohr' | 'generic' = 'generic') {
    const baseURL = systemType === 'bamboohr' 
      ? `https://api.bamboohr.com/api/gateway.php/${credentials.domain || 'company'}/v1`
      : credentials.domain || 'https://api.example.com';
    
    super(credentials, baseURL);
    this.systemType = systemType;
  }

  async connect(): Promise<boolean> {
    try {
      const testResult = await this.testConnection();
      this.isConnected = testResult;
      return testResult;
    } catch (error) {
      console.error('HR System connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    // Test with getting current user or company info
    const result = await this.getCompanyInfo();
    return result.success;
  }

  /**
   * Create new employee
   */
  async createEmployee(employee: Employee): Promise<APIResponse<any>> {
    console.log('👤 Creating employee in HR system:', employee.email);

    if (!this.isConnected) {
      await this.connect();
    }

    return this.retryRequest(async () => {
      if (this.systemType === 'bamboohr') {
        return await this.makeRequest('/employees', {
          method: 'POST',
          body: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            jobTitle: employee.jobTitle,
            department: employee.department,
            hireDate: employee.startDate,
          },
        });
      } else {
        // Generic HR system
        return await this.makeRequest('/api/employees', {
          method: 'POST',
          body: employee,
        });
      }
    });
  }

  /**
   * Get employee information
   */
  async getEmployee(employeeId: string): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    const endpoint = this.systemType === 'bamboohr'
      ? `/employees/${employeeId}`
      : `/api/employees/${employeeId}`;

    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Update employee information
   */
  async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    const endpoint = this.systemType === 'bamboohr'
      ? `/employees/${employeeId}`
      : `/api/employees/${employeeId}`;

    return await this.makeRequest(endpoint, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Submit leave request
   */
  async submitLeaveRequest(request: LeaveRequest): Promise<APIResponse<any>> {
    console.log('🏖️ Submitting leave request for employee:', request.employeeId);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest('/api/time_off/request', {
      method: 'POST',
      body: {
        ...request,
        status: 'pending',
      },
    });
  }

  /**
   * Get leave balance
   */
  async getLeaveBalance(employeeId: string): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    const endpoint = this.systemType === 'bamboohr'
      ? `/employees/${employeeId}/time_off/calculator`
      : `/api/employees/${employeeId}/leave_balance`;

    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Setup payroll for employee
   */
  async setupPayroll(payrollInfo: PayrollInfo): Promise<APIResponse<any>> {
    console.log('💰 Setting up payroll for employee:', payrollInfo.employeeId);

    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest('/api/payroll/setup', {
      method: 'POST',
      body: payrollInfo,
    });
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<APIResponse<any>> {
    const endpoint = this.systemType === 'bamboohr'
      ? '/meta/fields'
      : '/api/company';

    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Get all employees (with pagination)
   */
  async listEmployees(limit: number = 50, offset: number = 0): Promise<APIResponse<any>> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.makeRequest('/api/employees', {
      method: 'GET',
      params: {
        limit: limit.toString(),
        offset: offset.toString(),
      },
    });
  }

  /**
   * Get authentication headers (BambooHR uses Basic Auth)
   */
  protected getAuthHeaders(): Record<string, string> {
    if (this.systemType === 'bamboohr' && this.credentials.apiKey) {
      const auth = btoa(`${this.credentials.apiKey}:x`);
      return {
        'Authorization': `Basic ${auth}`,
      };
    }

    return super.getAuthHeaders();
  }
}

