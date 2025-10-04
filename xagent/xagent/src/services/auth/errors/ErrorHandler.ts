import { AuthError } from './AuthError';
import { getAuthErrorMessage } from './ErrorMessages';

export function handleAuthError(error: any): AuthError {
  // Handle specific error codes
  if (error?.message?.includes('Invalid login credentials') || 
      error?.code === 'invalid_credentials' ||
      error?.body?.includes('Invalid login credentials')) {
    return new AuthError('Invalid email or password', 'invalid_credentials', 401);
  }

  if (error?.message?.includes('User already registered') || 
      error?.code === 'user_exists') {
    return new AuthError('Email already in use. Please sign in instead.', 'user_exists', 409);
  }

  if (error?.message?.includes('Email not confirmed') || 
      error?.code === 'email_not_confirmed') {
    return new AuthError('Please confirm your email address before signing in.', 'email_not_confirmed', 401);
  }

  if (error?.code === 'unexpected_failure' || error?.status === 500) {
    // Retry database errors
    return new AuthError(
      'Service temporarily unavailable. Please try again.',
      'service_unavailable',
      503
    );
  }

  // Get user-friendly error message
  const message = getAuthErrorMessage(error);
  
  return new AuthError(
    message,
    error?.code || 'unknown_error',
    error?.status || 500
  );
}