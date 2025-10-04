import type { HttpRequestConfig } from '../types';
import { NodeExecutor } from './NodeExecutor';

export class HttpRequestExecutor extends NodeExecutor<HttpRequestConfig> {
  async execute(config: HttpRequestConfig): Promise<unknown> {
    const { url, method, headers, body, authentication } = config.parameters;

    // Add authentication headers if needed
    const finalHeaders = { ...headers };
    if (authentication) {
      switch (authentication.type) {
        case 'basic':
          finalHeaders['Authorization'] = `Basic ${btoa(
            `${authentication.credentials.username}:${authentication.credentials.password}`
          )}`;
          break;
        case 'bearer':
          finalHeaders['Authorization'] = `Bearer ${authentication.credentials.token}`;
          break;
      }
    }

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.statusText}`);
    }

    return response.json();
  }
}