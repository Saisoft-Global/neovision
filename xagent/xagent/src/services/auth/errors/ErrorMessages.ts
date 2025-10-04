export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  EMAIL_IN_USE: 'This email is already registered. Please sign in instead.',
  WEAK_PASSWORD: 'Password must be at least 6 characters long',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  UNEXPECTED: 'An unexpected error occurred. Please try again.',
  DATABASE_ERROR: 'Unable to complete operation. Please try again.',
  USER_NOT_FOUND: 'User not found. Please check your credentials.',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address before signing in.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
} as const;

export function getAuthErrorMessage(error: any): string {
  if (error?.message?.includes('Invalid login credentials') || 
      error?.code === 'invalid_credentials' ||
      error?.body?.includes('Invalid login credentials')) {
    return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  
  if (error?.message?.includes('User already registered') || 
      error?.code === 'user_exists') {
    return AUTH_ERROR_MESSAGES.EMAIL_IN_USE;
  }

  if (error?.message?.includes('Email not confirmed') || 
      error?.code === 'email_not_confirmed') {
    return AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED;
  }
  
  if (error?.message?.includes('User not found') || 
      error?.code === 'user_not_found') {
    return AUTH_ERROR_MESSAGES.USER_NOT_FOUND;
  }

  if (error?.code === 'unexpected_failure' || error?.status === 500) {
    return AUTH_ERROR_MESSAGES.DATABASE_ERROR;
  }

  if (error?.status === 400 && error?.body) {
    try {
      const body = JSON.parse(error.body);
      return body.message || AUTH_ERROR_MESSAGES.UNEXPECTED;
    } catch {
      return AUTH_ERROR_MESSAGES.UNEXPECTED;
    }
  }

  if (error?.message?.includes('Failed to fetch') || error?.name === 'NetworkError') {
    return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
  }

  return error?.message || AUTH_ERROR_MESSAGES.UNEXPECTED;
}