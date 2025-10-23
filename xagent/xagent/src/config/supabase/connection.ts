import { getSupabaseClient } from './client';

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;

    // Test connection with auth.getSession() - this is lightweight and always available
    const { error } = await client.auth.getSession();
    
    // If we get here without throwing, connection is working
    // Error might indicate auth issues but not connection issues
    return true;
  } catch (error) {
    console.warn('Supabase connection test failed:', error);
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