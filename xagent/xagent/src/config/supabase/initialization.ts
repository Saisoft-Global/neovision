import { createClient } from '@supabase/supabase-js';
import { isServiceConfigured } from '../environment';
import { EventEmitter } from '../../utils/events/EventEmitter';
import { withRetry } from '../../utils/retry';
import { handleSupabaseError } from '../../utils/errors/supabase';

class SupabaseInitializer {
  private static instance: SupabaseInitializer;
  private client: any = null;
  private eventEmitter: EventEmitter;
  private initPromise: Promise<void> | null = null;
  private initialized: boolean = false;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): SupabaseInitializer {
    if (!this.instance) {
      this.instance = new SupabaseInitializer();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = withRetry(async () => {
      if (!isServiceConfigured('supabase')) {
        throw new Error('Supabase configuration missing');
      }

      try {
        this.client = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
              storage: window.localStorage,
            }
          }
        );

        // Test connection with a simple query
        const { error } = await this.client
          .from('health_check')
          .select('count')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw handleSupabaseError(error);
        }

        this.initialized = true;
        this.eventEmitter.emit('initialized', this.client);
      } catch (error) {
        this.initialized = false;
        this.client = null;
        throw error;
      } finally {
        this.initPromise = null;
      }
    });

    return this.initPromise;
  }

  getClient() {
    return this.client;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  onInitialized(callback: (client: any) => void): void {
    if (this.initialized && this.client) {
      callback(this.client);
    }
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.eventEmitter.on('error', callback);
  }
}

export const supabaseInitializer = SupabaseInitializer.getInstance();