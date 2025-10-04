export class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'OpenAIError';
  }

  static fromError(error: any): OpenAIError {
    // Handle rate limits
    if (error?.status === 429) {
      return new OpenAIError(
        'OpenAI rate limit exceeded. Please try again later.',
        'rate_limit_exceeded',
        429
      );
    }

    // Handle quota exceeded
    if (error?.error?.code === 'insufficient_quota') {
      return new OpenAIError(
        'OpenAI API quota exceeded. Please check your billing details.',
        'insufficient_quota',
        402
      );
    }

    // Handle invalid API key
    if (error?.error?.code === 'invalid_api_key') {
      return new OpenAIError(
        'Invalid OpenAI API key. Please check your configuration.',
        'invalid_api_key',
        401
      );
    }

    // Handle service unavailable
    if (error?.status === 503) {
      return new OpenAIError(
        'OpenAI service is temporarily unavailable. Please try again later.',
        'service_unavailable',
        503
      );
    }

    return new OpenAIError(
      error?.message || 'OpenAI API request failed',
      error?.error?.code,
      error?.status
    );
  }
}

export function handleOpenAIError(error: any): never {
  throw OpenAIError.fromError(error);
}