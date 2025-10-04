import { supabaseInitializer } from './initialization';

export function getSupabaseClient() {
  return supabaseInitializer.getClient();
}

// Export for backward compatibility
export const supabase = getSupabaseClient();