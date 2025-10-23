// Retry utility for handling failed operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries + 1} attempts:`, error);
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function withRetryConditional<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries || !shouldRetry(lastError, attempt)) {
        console.error(`Operation failed after ${attempt + 1} attempts:`, error);
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export function createRetryDecorator(
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  return function <T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: any[]) => {
      return withRetry(() => fn(...args), maxRetries, baseDelay);
    }) as T;
  };
}