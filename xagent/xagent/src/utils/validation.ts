/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if required environment variables are present and valid
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const env = import.meta.env;

  // Validate Supabase config
  if (!env.VITE_SUPABASE_URL) {
    errors.push('Missing Supabase URL');
  } else if (!isValidUrl(env.VITE_SUPABASE_URL)) {
    errors.push('Invalid Supabase URL format');
  }
  if (!env.VITE_SUPABASE_ANON_KEY) {
    errors.push('Missing Supabase anonymous key');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}