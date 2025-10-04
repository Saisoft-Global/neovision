import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, Role } from '../../types/auth';
import { getSupabaseClient } from '../../config/supabase';
import { SessionManager } from './SessionManager';
import { handleAuthError } from './errors/ErrorHandler';
import { withRetry } from '../../utils/retry';

export class AuthService {
  private static instance: AuthService;
  private sessionManager: SessionManager;
  private retryAttempts: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
  }

  public static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      // Skip auth check for public routes
      if (this.isPublicRoute()) {
        return null;
      }

      const { data: { user }, error } = await withRetry(
        () => supabase.auth.getUser(),
        this.MAX_RETRIES,
        1000
      );

      if (error) {
        // Only log error if not a missing session on public route
        if (!(error.name === 'AuthSessionMissingError' && this.isPublicRoute())) {
          console.error('Get current user error:', error);
        }
        return null;
      }

      return user ? this.transformUser(user) : null;
    } catch (error) {
      // Only log error if not a missing session on public route
      if (!(error?.name === 'AuthSessionMissingError' && this.isPublicRoute())) {
        console.error('Error getting current user:', error);
      }
      return null;
    }
  }

  private isPublicRoute(): boolean {
    return this.PUBLIC_ROUTES.includes(window.location.pathname);
  }

  async signIn(email: string, password: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Authentication service not available');
    }

    try {
      const { data, error } = await withRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        this.MAX_RETRIES,
        1000
      );

      if (error) {
        throw handleAuthError(error);
      }

      // Reset retry attempts on successful sign in
      this.retryAttempts = 0;

      // Ensure user data is synced
      if (data.user) {
        await this.syncUserData(data.user);
      }
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Authentication service not available');
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('EMAIL_IN_USE');
      }

      const { data, error } = await withRetry(
        () => supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'user',
              permissions: ['agents:read', 'documents:read', 'knowledge:read'],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
        this.MAX_RETRIES,
        1000
      );

      if (error) {
        throw handleAuthError(error);
      }

      // Sync user data after successful signup
      if (data.user) {
        await this.syncUserData(data.user);
      }
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await withRetry(
        () => supabase.auth.signOut(),
        this.MAX_RETRIES,
        1000
      );
      
      if (error) throw handleAuthError(error);
      
      // Clean up session
      this.sessionManager.cleanup();
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  private async syncUserData(user: SupabaseUser): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await withRetry(
        () => supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'user',
            permissions: user.user_metadata?.permissions || [],
            updated_at: new Date().toISOString(),
          })
          .select()
          .single(),
        this.MAX_RETRIES,
        1000
      );

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }

  private transformUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role: (supabaseUser.user_metadata?.role || 'user') as Role,
      permissions: supabaseUser.user_metadata?.permissions || [],
      createdAt: new Date(supabaseUser.created_at),
      lastLoginAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : undefined,
    };
  }
}