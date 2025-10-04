export interface Neo4jGraphDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeQuery(query: string, params?: Record<string, any>): Promise<any>;
}