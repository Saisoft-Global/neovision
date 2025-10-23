import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthStore, User } from '../types/auth';
import { getSupabaseClient } from '../config/supabase';
import { AuthService } from '../services/auth/AuthService';
import { SessionManager } from '../services/auth/SessionManager';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  setUser: (user: User | null) => set({ user }),
  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  initialize: async () => {
    try {
      set({ isLoading: true });
      
      // Initialize session manager first
      const sessionManager = SessionManager.getInstance();
      await sessionManager.initialize();
      
      // Get current session from Supabase
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error:', sessionError);
        set({ user: null, session: null, isInitialized: true });
        return;
      }
      
      if (!session) {
        console.log('No active session found');
        set({ user: null, session: null, isInitialized: true });
        return;
      }
      
      // Fetch user profile from public.users table
      const authService = new AuthService();
      const user = await authService.getCurrentUser();
      
      // If user exists in Supabase auth but not in public.users, create profile
      if (!user && session.user) {
        console.log('Creating user profile in public.users');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: 'user',
            permissions: ['documents:read', 'knowledge:read']
          })
          .select()
          .single();
        
        if (!createError && newUser) {
          set({
            user: {
              id: newUser.id,
              email: newUser.email,
              name: session.user.user_metadata?.name,
              role: newUser.role
            },
            session,
            isInitialized: true
          });
          return;
        }
      }
      
      set({ user, session, isInitialized: true });
      
      // Set up auth state listener
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession) {
          const updatedUser = await authService.getCurrentUser();
          set({ user: updatedUser, session: newSession });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          set({ session: newSession });
        }
      });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to initialize', isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const authService = new AuthService();
      const result = await authService.login(email, password);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Get fresh session
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch full user profile from public.users
      const user = await authService.getCurrentUser();
      
      set({ user, session });
      console.log('✅ Login successful:', user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({ error: errorMessage });
      console.error('❌ Login error:', errorMessage);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const authService = new AuthService();
      await authService.logout();
      
      // Clear session manager
      const sessionManager = SessionManager.getInstance();
      await sessionManager.signOut();
      
      set({ user: null, session: null });
      console.log('✅ Logout successful');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      set({ error: errorMessage });
      console.error('❌ Logout error:', errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },
  signIn: async (email: string, password: string) => {
    return get().login(email, password);
  },
  signUp: async (email: string, password: string, name?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const authService = new AuthService();
      const result = await authService.register(email, password, name);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Get fresh session
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create user profile in public.users
      if (session?.user) {
        await supabase.from('users').insert({
          id: session.user.id,
          email: session.user.email,
          role: 'user',
          permissions: ['documents:read', 'knowledge:read'],
          metadata: { name: name || email.split('@')[0] }
        });
      }
      
      const user = await authService.getCurrentUser();
      set({ user, session });
      console.log('✅ Registration successful:', user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({ error: errorMessage });
      console.error('❌ Registration error:', errorMessage);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);