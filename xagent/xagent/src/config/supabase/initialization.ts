// Supabase initialization service with graceful fallback
import { getSupabaseClient, isSupabaseAvailable } from './index';

export class SupabaseInitializer {
  private static instance: SupabaseInitializer;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private callbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  static getInstance(): SupabaseInitializer {
    if (!SupabaseInitializer.instance) {
      SupabaseInitializer.instance = new SupabaseInitializer();
    }
    return SupabaseInitializer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available, using mock initialization');
        this.isInitialized = true;
        this.notifyCallbacks();
        return;
      }

      const supabase = getSupabaseClient();
      
      // Test connection
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Supabase session check failed:', error.message);
      }

      this.isInitialized = true;
      this.notifyCallbacks();
    } catch (error) {
      console.error('Supabase initialization failed:', error);
      this.notifyErrorCallbacks(error as Error);
      throw error;
    }
  }

  onInitialized(callback: () => void): void {
    if (this.isInitialized) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback());
    this.callbacks = [];
  }

  private notifyErrorCallbacks(error: Error): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

export const supabaseInitializer = SupabaseInitializer.getInstance();