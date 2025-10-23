/**
 * Sentry error tracking service
 * Captures and reports errors to Sentry
 */
import * as Sentry from '@sentry/react';

export class SentryService {
  private static instance: SentryService;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): SentryService {
    if (!this.instance) {
      this.instance = new SentryService();
    }
    return this.instance;
  }

  private initialize() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

    if (!dsn) {
      console.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        // Performance Monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        // Don't send errors in development
        enabled: environment !== 'development',
        beforeSend(event, hint) {
          // Filter out certain errors
          const error = hint.originalException as Error;
          
          // Don't send network errors
          if (error?.message?.includes('NetworkError')) {
            return null;
          }
          
          // Don't send cancelled requests
          if (error?.message?.includes('AbortError')) {
            return null;
          }
          
          return event;
        },
      });

      this.initialized = true;
      console.log('✅ Sentry initialized');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return;

    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string }) {
    if (!this.initialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.initialized) return;

    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }) {
    if (!this.initialized) return;

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set context
   */
  setContext(name: string, context: Record<string, any>) {
    if (!this.initialized) return;

    Sentry.setContext(name, context);
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    if (!this.initialized) return null;

    return Sentry.startTransaction({ name, op });
  }
}

// Export singleton instance
export const sentryService = SentryService.getInstance();
