export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }

  static fromSupabaseError(error: any): AuthError {
    return new AuthError(
      error.message || 'Authentication failed',
      error.code,
      error.status
    );
  }
}