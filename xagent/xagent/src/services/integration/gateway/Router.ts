import type { APIRequest, APIResponse } from '../../../types/api';
import { DataSourceManager } from '../datasource/DataSourceManager';

export class Router {
  private routes: Map<string, (req: APIRequest) => Promise<APIResponse>>;
  private dataSourceManager: DataSourceManager;

  constructor() {
    this.routes = new Map();
    this.dataSourceManager = DataSourceManager.getInstance();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Data source routes
    this.routes.set('GET /datasources', this.listDataSources.bind(this));
    this.routes.set('POST /datasources/query', this.queryDataSource.bind(this));
    this.routes.set('POST /datasources/connect', this.connectDataSource.bind(this));
  }

  async route(request: APIRequest): Promise<APIResponse> {
    const routeKey = `${request.method} ${request.path}`;
    const handler = this.routes.get(routeKey);

    if (!handler) {
      return {
        status: 404,
        body: { error: 'Route not found' },
      };
    }

    return handler(request);
  }

  private async listDataSources(request: APIRequest): Promise<APIResponse> {
    const sources = await this.dataSourceManager.listSources();
    return { status: 200, body: sources };
  }

  private async queryDataSource(request: APIRequest): Promise<APIResponse> {
    const { sourceId, query } = request.body;
    const result = await this.dataSourceManager.query(sourceId, query);
    return { status: 200, body: result };
  }

  private async connectDataSource(request: APIRequest): Promise<APIResponse> {
    const { type, config } = request.body;
    const source = await this.dataSourceManager.connect(type, config);
    return { status: 201, body: source };
  }
}