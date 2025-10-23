// Production Supabase configuration - no mocks
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Supabase configuration missing! Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

if (!supabaseUrl.includes('supabase.co')) {
  throw new Error('❌ Invalid Supabase URL! Must be a valid Supabase project URL.');
}

if (supabaseKey.length < 20) {
  throw new Error('❌ Invalid Supabase key! Please check VITE_SUPABASE_ANON_KEY.');
}

console.log('🔗 Supabase Configuration:', {
  url: supabaseUrl.substring(0, 30) + '...',
  keyLength: supabaseKey.length,
  isValid: true
});

// Create Supabase client instance
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'multi-agent-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

console.log('✅ Supabase client initialized successfully');

// Export the client
export { supabase };

// Export utility functions
export const getSupabaseClient = (): SupabaseClient => supabase;

export const isSupabaseAvailable = (): boolean => true; // Always available in production

export const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
};

// Alias for backward compatibility
export const checkSupabaseConnection = isSupabaseConnected;