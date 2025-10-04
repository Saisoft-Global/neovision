import { getSupabaseClient } from '../../config/supabase';
import { EventEmitter } from '../../utils/events/EventEmitter';
import { withRetry } from '../../utils/retry';

export class SessionManager {
  private static instance: SessionManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private eventEmitter: EventEmitter;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly SESSION_KEY = 'sb-session';
  private readonly REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
  private readonly PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): SessionManager {
    if (!this.instance) {
      this.instance = new SessionManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = withRetry(async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      try {
        // Skip session recovery for public routes
        if (this.isPublicRoute()) {
          this.initialized = true;
          this.eventEmitter.emit('initialized');
          return;
        }

        // Recover session if exists
        const savedSession = await this.recoverSession();
        if (savedSession) {
          const { data: { session }, error } = await supabase.auth.setSession(savedSession);
          if (!error && session) {
            this.startRefreshCycle();
          }
        }

        // Setup auth state change listener
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            await this.clearSession();
            this.cleanup();
            this.eventEmitter.emit('signedOut');
          } else if (event === 'SIGNED_IN') {
            await this.persistSession(session);
            this.startRefreshCycle();
            this.eventEmitter.emit('signedIn', session);
          }
        });

        this.initialized = true;
        this.eventEmitter.emit('initialized');
      } catch (error) {
        // Don't emit error for public routes
        if (!this.isPublicRoute()) {
          console.error('Session manager initialization error:', error);
          this.eventEmitter.emit('error', error);
        }
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    }, 3, 1000); // 3 retries with 1s base delay

    return this.initializationPromise;
  }

  private isPublicRoute(): boolean {
    return this.PUBLIC_ROUTES.includes(window.location.pathname);
  }

  async refreshSession(): Promise<void> {
    if (this.isPublicRoute()) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        this.eventEmitter.emit('sessionError', error);
        return;
      }
      if (session) {
        await this.persistSession(session);
        this.eventEmitter.emit('sessionRefreshed', session);
      }
    } catch (error) {
      if (!this.isPublicRoute()) {
        console.error('Session refresh error:', error);
        this.eventEmitter.emit('sessionError', error);
      }
    }
  }

  private async persistSession(session: any): Promise<void> {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  private async recoverSession(): Promise<any | null> {
    try {
      const savedSession = localStorage.getItem(this.SESSION_KEY);
      return savedSession ? JSON.parse(savedSession) : null;
    } catch (error) {
      console.error('Failed to recover session:', error);
      return null;
    }
  }

  private async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  private startRefreshCycle(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.refreshSession();
    }, this.REFRESH_INTERVAL);

    // Initial refresh
    this.refreshSession();
  }

  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.initialized = false;
    this.eventEmitter.clear();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  onSessionError(callback: (error: any) => void): void {
    this.eventEmitter.on('sessionError', callback);
  }

  onSignedIn(callback: (session: any) => void): void {
    this.eventEmitter.on('signedIn', callback);
  }

  onSignedOut(callback: () => void): void {
    this.eventEmitter.on('signedOut', callback);
  }

  onInitialized(callback: () => void): void {
    if (this.initialized) {
      callback();
    }
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.eventEmitter.on('error', callback);
  }
}