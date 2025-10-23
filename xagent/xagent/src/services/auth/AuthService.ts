// Real Auth service with proper implementation
import { getSupabaseClient } from '../../config/supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthResult {
  user: User | null;
  token?: string;
  error?: string;
}

export class AuthService {
  private supabase = getSupabaseClient();

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      const user: User = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: data.user?.user_metadata?.name,
        role: data.user?.user_metadata?.role
      };

      return { user, token: data.session?.access_token };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: 'Login failed' };
    }
  }

  async register(email: string, password: string, name?: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      const user: User = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: name || email.split('@')[0]
      };

      return { user, token: data.session?.access_token };
    } catch (error) {
      console.error('Registration error:', error);
      return { user: null, error: 'Registration failed' };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser } } = await this.supabase.auth.getUser();
      
      if (!authUser) {
        return null;
      }

      // Fetch user profile from public.users table
      const { data: userProfile, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !userProfile) {
        console.warn('User profile not found in public.users, using auth data:', error);
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name,
          role: authUser.user_metadata?.role || 'user'
        };
      }

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.metadata?.name || authUser.user_metadata?.name,
        role: userProfile.role,
        permissions: userProfile.permissions
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        return { user: null, error: error.message };
      }

      const user: User = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: data.user?.user_metadata?.name,
        role: data.user?.user_metadata?.role
      };

      return { user };
    } catch (error) {
      console.error('Profile update error:', error);
      return { user: null, error: 'Profile update failed' };
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: authListener } = this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          role: session.user.user_metadata?.role
        };
        callback(user);
      } else {
        callback(null);
      }
    });
    
    // Return the subscription object for cleanup
    return authListener?.subscription || { unsubscribe: () => {} };
  }
}

export const authService = new AuthService();