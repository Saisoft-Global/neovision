import { EventEmitter } from '../events/EventEmitter';

export class Logger {
  private static instance: Logger;
  private eventEmitter: EventEmitter;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  log(level: LogLevel, message: string, context?: string, metadata?: Record<string, unknown>): void {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      context: context || 'general',
      metadata,
    };

    this.addLogEntry(logEntry);
    this.eventEmitter.emit('log', logEntry);
    this.consoleLog(logEntry);
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    const metadata = entry.metadata ? JSON.stringify(entry.metadata) : '';

    switch (entry.level) {
      case 'debug':
        console.debug(`${timestamp} ${context} ${entry.message}`, metadata);
        break;
      case 'info':
        console.info(`${timestamp} ${context} ${entry.message}`, metadata);
        break;
      case 'warning':
        console.warn(`${timestamp} ${context} ${entry.message}`, metadata);
        break;
      case 'error':
      case 'critical':
        console.error(`${timestamp} ${context} ${entry.message}`, metadata);
        break;
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, context, metadata);
  }

  warning(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('warning', message, context, metadata);
  }

  error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, context, metadata);
  }

  critical(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('critical', message, context, metadata);
  }

  getLogs(options: GetLogsOptions = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    if (options.context) {
      filteredLogs = filteredLogs.filter(log => log.context === options.context);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.context.toLowerCase().includes(searchLower)
      );
    }

    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  onLog(callback: (log: LogEntry) => void): void {
    this.eventEmitter.on('log', callback);
  }
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: string;
  metadata?: Record<string, unknown>;
}

export interface GetLogsOptions {
  level?: LogLevel;
  context?: string;
  search?: string;
  limit?: number;
}