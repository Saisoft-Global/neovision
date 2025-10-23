/**
 * Base API Connector
 * Abstract class for all third-party API integrations
 */

export interface APICredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  domain?: string;
  username?: string;
  password?: string;
  customFields?: Record<string, string>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
}

export abstract class APIConnector {
  protected credentials: APICredentials;
  protected baseURL: string;
  protected isConnected: boolean = false;
  protected rateLimitRemaining: number = 1000;

  constructor(credentials: APICredentials, baseURL: string) {
    this.credentials = credentials;
    this.baseURL = baseURL;
  }

  /**
   * Connect to the API (authentication, setup)
   */
  abstract connect(): Promise<boolean>;

  /**
   * Disconnect and cleanup
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test if connection is valid
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Generic API request method
   */
  protected async makeRequest<T = any>(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = 30000,
    } = options;

    try {
      // Build URL with params
      const url = new URL(endpoint, this.baseURL);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Build headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers,
      };

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update rate limit info (if available)
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      if (rateLimit) {
        this.rateLimitRemaining = parseInt(rateLimit, 10);
      }

      // Parse response
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || data?.message || `API request failed with status ${response.status}`,
          statusCode: response.status,
          data,
        };
      }

      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get authentication headers (override in subclasses)
   */
  protected getAuthHeaders(): Record<string, string> {
    if (this.credentials.apiKey) {
      return {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      };
    }
    if (this.credentials.accessToken) {
      return {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
      };
    }
    return {};
  }

  /**
   * Check if connector is ready to use
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; isLimited: boolean } {
    return {
      remaining: this.rateLimitRemaining,
      isLimited: this.rateLimitRemaining < 10,
    };
  }

  /**
   * Retry mechanism for failed requests
   */
  protected async retryRequest<T>(
    requestFn: () => Promise<APIResponse<T>>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<APIResponse<T>> {
    let lastError: APIResponse<T> | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await requestFn();
        if (result.success) {
          return result;
        }
        lastError = result;

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        }
      } catch (error) {
        lastError = {
          success: false,
          error: error instanceof Error ? error.message : 'Request failed',
        };
      }
    }

    return lastError || {
      success: false,
      error: 'Max retries exceeded',
    };
  }
}

