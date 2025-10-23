// Session management service
import { getSupabaseClient, isSupabaseAvailable } from '../../config/supabase';

export class SessionManager {
  private static instance: SessionManager;
  private isInitialized = false;
  private session: any = null;
  private authSubscription: { unsubscribe: () => void } | null = null;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available, using mock session manager');
        this.isInitialized = true;
        return;
      }

      const supabase = getSupabaseClient();
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Failed to get session:', error.message);
      } else {
        this.session = session;
      }

      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        this.session = session;
        this.handleAuthStateChange(event, session);
      });
      
      // Store the subscription for cleanup
      this.authSubscription = authListener?.subscription || null;

      this.isInitialized = true;
    } catch (error) {
      console.error('Session manager initialization failed:', error);
      throw error;
    }
  }

  private handleAuthStateChange(event: string, session: any): void {
    console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { event, session }
    }));
  }

  getCurrentSession(): any {
    return this.session;
  }

  getCurrentUser(): any {
    return this.session?.user || null;
  }

  isUserLoggedIn(): boolean {
    return !!this.session?.user;
  }

  async refreshSession(): Promise<any> {
    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        return null;
      }

      this.session = session;
      return session;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available, simulating sign out');
      this.session = null;
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out failed:', error);
        throw error;
      }

      this.session = null;
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  destroy(): void {
    // Cleanup auth subscription
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    this.session = null;
    this.isInitialized = false;
  }
}