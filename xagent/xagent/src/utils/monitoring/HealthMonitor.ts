import { EventEmitter } from '../events/EventEmitter';
import { Logger } from '../logging/Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { neo4jClient } from '../../services/neo4j/client';
import { getVectorStore } from '../../services/pinecone/client';
import { supabase } from '../../config/supabase';

export class HealthMonitor {
  private static instance: HealthMonitor;
  private eventEmitter: EventEmitter;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private checkInterval: number = 60000; // 1 minute
  private intervalId: number | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  public static getInstance(): HealthMonitor {
    if (!this.instance) {
      this.instance = new HealthMonitor();
    }
    return this.instance;
  }

  startMonitoring(): void {
    if (this.intervalId !== null) return;

    this.checkHealth();
    this.intervalId = window.setInterval(() => this.checkHealth(), this.checkInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkHealth(): Promise<void> {
    const status: SystemHealth = {
      timestamp: new Date(),
      services: {
        database: await this.checkDatabaseHealth(),
        vectorStore: await this.checkVectorStoreHealth(),
        graphDatabase: await this.checkGraphDatabaseHealth(),
      },
      overall: 'healthy'
    };

    // Determine overall health
    if (Object.values(status.services).some(s => s.status === 'error')) {
      status.overall = 'error';
    } else if (Object.values(status.services).some(s => s.status === 'degraded')) {
      status.overall = 'degraded';
    }

    // Log status
    this.logger.info('Health check completed', 'monitoring', status);

    // Emit events based on status
    this.eventEmitter.emit('healthCheck', status);
    if (status.overall !== 'healthy') {
      this.eventEmitter.emit('healthIssue', status);
    }
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const { data, error } = await supabase
        .from('health_check')
        .select('count')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        status: 'healthy',
        latency: 0, // Would measure actual latency in production
        message: 'Database is operational'
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'database_health_check');
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database health check failed'
      };
    }
  }

  private async checkVectorStoreHealth(): Promise<ServiceHealth> {
    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        return {
          status: 'disabled',
          message: 'Vector store is not configured'
        };
      }

      await vectorStore.describeIndexStats();
      return {
        status: 'healthy',
        message: 'Vector store is operational'
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'vector_store_health_check');
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Vector store health check failed'
      };
    }
  }

  private async checkGraphDatabaseHealth(): Promise<ServiceHealth> {
    try {
      if (!neo4jClient) {
        return {
          status: 'disabled',
          message: 'Graph database is not configured'
        };
      }

      if (!neo4jClient.isConnected()) {
        await neo4jClient.connect();
      }

      await neo4jClient.executeQuery('RETURN 1');
      return {
        status: 'healthy',
        message: 'Graph database is operational'
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'graph_database_health_check');
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Graph database health check failed'
      };
    }
  }

  onHealthCheck(callback: (status: SystemHealth) => void): void {
    this.eventEmitter.on('healthCheck', callback);
  }

  onHealthIssue(callback: (status: SystemHealth) => void): void {
    this.eventEmitter.on('healthIssue', callback);
  }
}

export type HealthStatus = 'healthy' | 'degraded' | 'error' | 'disabled';

export interface ServiceHealth {
  status: HealthStatus;
  latency?: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  timestamp: Date;
  overall: HealthStatus;
  services: {
    database: ServiceHealth;
    vectorStore: ServiceHealth;
    graphDatabase: ServiceHealth;
  };
}