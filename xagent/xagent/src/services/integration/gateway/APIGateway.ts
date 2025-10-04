import { Router } from './Router';
import { RateLimiter } from './RateLimiter';
import { AuthMiddleware } from './AuthMiddleware';
import type { APIRequest, APIResponse } from '../../../types/api';

export class APIGateway {
  private static instance: APIGateway;
  private router: Router;
  private rateLimiter: RateLimiter;
  private authMiddleware: AuthMiddleware;

  private constructor() {
    this.router = new Router();
    this.rateLimiter = new RateLimiter();
    this.authMiddleware = new AuthMiddleware();
  }

  public static getInstance(): APIGateway {
    if (!this.instance) {
      this.instance = new APIGateway();
    }
    return this.instance;
  }

  async handleRequest(request: APIRequest): Promise<APIResponse> {
    try {
      // Apply rate limiting
      await this.rateLimiter.checkLimit(request);

      // Authenticate request
      await this.authMiddleware.authenticate(request);

      // Route request to appropriate handler
      return await this.router.route(request);
    } catch (error: any) {
      return {
        status: error.status || 500,
        body: { error: error.message },
      };
    }
  }
}