/**
 * Centralized logging service
 * Provides structured logging with different levels
 */
import { sentryService } from '../monitoring/SentryService';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  /**
   * Log a debug message
   */
  debug(message: string, category: string = 'app', data?: any) {
    this.log(LogLevel.DEBUG, message, category, data);
  }

  /**
   * Log an info message
   */
  info(message: string, category: string = 'app', data?: any) {
    this.log(LogLevel.INFO, message, category, data);
  }

  /**
   * Log a warning
   */
  warn(message: string, category: string = 'app', data?: any) {
    this.log(LogLevel.WARN, message, category, data);
    
    // Send to Sentry
    sentryService.captureMessage(message, 'warning');
    if (data) {
      sentryService.setContext(category, data);
    }
  }

  /**
   * Log an error
   */
  error(message: string, category: string = 'app', error?: Error, data?: any) {
    this.log(LogLevel.ERROR, message, category, data, error);
    
    // Send to Sentry
    if (error) {
      sentryService.captureException(error, { category, message, ...data });
    } else {
      sentryService.captureMessage(message, 'error');
    }
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    message: string,
    category: string,
    data?: any,
    error?: Error
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output
    const consoleMethod = level === LogLevel.ERROR ? 'error' :
                         level === LogLevel.WARN ? 'warn' :
                         level === LogLevel.DEBUG ? 'debug' : 'log';

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`;
    
    if (error) {
      console[consoleMethod](prefix, message, error, data);
    } else if (data) {
      console[consoleMethod](prefix, message, data);
    } else {
      console[consoleMethod](prefix, message);
    }

    // Add breadcrumb to Sentry
    sentryService.addBreadcrumb({
      message,
      category,
      level: level as any,
      data,
    });
  }

  /**
   * Get log history
   */
  getHistory(level?: LogLevel, category?: string): LogEntry[] {
    let filtered = this.logHistory;

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (category) {
      filtered = filtered.filter(entry => entry.category === category);
    }

    return filtered;
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
