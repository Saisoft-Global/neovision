export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'SupabaseError';
  }

  static fromError(error: any): SupabaseError {
    if (error?.code === 'PGRST116') {
      // Not an error - just means no rows found
      return new SupabaseError('No data found', 'not_found', 404);
    }

    if (error?.code === '23505') {
      return new SupabaseError('Record already exists', 'duplicate', 409);
    }

    if (error?.code === '42P01') {
      return new SupabaseError('Table does not exist', 'not_found', 404);
    }

    return new SupabaseError(
      error?.message || 'Database operation failed',
      error?.code,
      error?.status || 500
    );
  }
}

export function handleSupabaseError(error: any): never {
  throw SupabaseError.fromError(error);
}