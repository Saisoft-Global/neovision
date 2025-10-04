import { getSupabaseClient } from './client';

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;

    // Simple lightweight query that will work even if table is empty
    const { error } = await client
      .from('health_check')
      .select('count')
      .maybeSingle();

    // Any successful query means connection is working
    // PGRST116 means no rows found, which is also fine
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