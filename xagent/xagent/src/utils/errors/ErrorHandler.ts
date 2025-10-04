import { EventEmitter } from '../events/EventEmitter';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private eventEmitter: EventEmitter;
  private errorLog: ErrorLog[] = [];

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): ErrorHandler {
    if (!this.instance) {
      this.instance = new ErrorHandler();
    }
    return this.instance;
  }

  handleError(error: unknown, context?: string): void {
    const errorLog = this.createErrorLog(error, context);
    this.logError(errorLog);
    this.eventEmitter.emit('error', errorLog);
  }

  private createErrorLog(error: unknown, context?: string): ErrorLog {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      context: context || 'unknown',
      level: this.determineErrorLevel(error),
      message: this.extractErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
      metadata: this.extractErrorMetadata(error),
    };

    return errorLog;
  }

  private determineErrorLevel(error: unknown): ErrorLevel {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') return 'warning';
      if (error.name === 'AuthError') return 'error';
      if (error.name === 'NetworkError') return 'error';
    }
    return 'error';
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }

  private extractErrorMetadata(error: unknown): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    if (error instanceof Error) {
      metadata.name = error.name;
      metadata.cause = error.cause;
    }

    return metadata;
  }

  private logError(errorLog: ErrorLog): void {
    this.errorLog.push(errorLog);
    console.error(
      `[${errorLog.level.toUpperCase()}] ${errorLog.context}: ${errorLog.message}`,
      {
        id: errorLog.id,
        timestamp: errorLog.timestamp,
        metadata: errorLog.metadata,
        stack: errorLog.stack,
      }
    );
  }

  getRecentErrors(limit: number = 100): ErrorLog[] {
    return this.errorLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearErrors(): void {
    this.errorLog = [];
  }

  onError(callback: (error: ErrorLog) => void): void {
    this.eventEmitter.on('error', callback);
  }
}

export type ErrorLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLog {
  id: string;
  timestamp: Date;
  context: string;
  level: ErrorLevel;
  message: string;
  stack?: string;
  metadata: Record<string, unknown>;
}