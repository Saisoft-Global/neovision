import { create } from 'zustand';
import type { AuthStore, User } from '../types/auth';
import { getSupabaseClient } from '../config/supabase';
import { AuthService } from '../services/auth/AuthService';

export const useAuthStore = create<AuthStore>((set) => ({
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
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      set({ user, session, isInitialized: true });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize' });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const authService = AuthService.getInstance();
      await authService.signIn(email, password);
      const user = await authService.getCurrentUser();
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      set({ user, session });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed' });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      const authService = AuthService.getInstance();
      await authService.signOut();
      set({ user: null, session: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Logout failed' });
    } finally {
      set({ isLoading: false });
    }
  },
}));