import { createClient } from '@supabase/supabase-js';
import { isServiceConfigured } from './environment';

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    if (!isServiceConfigured('supabase')) {
      console.warn('Supabase is not configured. Please check your environment variables.');
      return null;
    }

    supabaseClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'multi-agent-auth',
          storage: window.localStorage
        }
      }
    );
  }
  return supabaseClient;
}

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;

    // Test connection with a lightweight query
    const { error } = await client
      .from('health_check')
      .select('count')
      .limit(1)
      .single();

    // PGRST116 means no rows found, which is fine
    return !error || error.code === 'PGRST116';
  } catch {
    return false;
  }
}

export async function initializeSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  try {
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Supabase');
    }
    return client;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    throw error;
  }
}

// Export the client instance
export const supabase = getSupabaseClient();