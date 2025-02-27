/**
 * Retry Utility
 * 
 * Provides a robust retry mechanism for handling transient errors in
 * network operations, especially useful for Firestore/Firebase operations.
 */

/**
 * Configuration options for the retry mechanism
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Initial delay in milliseconds before first retry */
  initialDelayMs?: number;
  
  /** Factor by which to increase delay on each retry */
  backoffFactor?: number;
  
  /** Maximum delay in milliseconds between retries */
  maxDelayMs?: number;
  
  /** Jitter factor (0-1) to randomize delay times */
  jitterFactor?: number;
  
  /** Function to determine if an error is retriable */
  isRetriableError?: (error: any) => boolean;
  
  /** Function to call before each retry attempt */
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

/**
 * Default options for retry mechanism
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffFactor: 2,
  maxDelayMs: 5000,
  jitterFactor: 0.2,
  isRetriableError: (error: any) => {
    // Default implementation treats network errors and Firestore UNAVAILABLE
    // errors as retriable
    const errorMessage = error?.message || error?.toString() || '';
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('INTERNAL') ||
      errorMessage.includes('deadline exceeded')
    );
  },
  onRetry: (attempt: number, delay: number, error: any) => {
    console.warn(`Retry attempt ${attempt} after ${delay}ms due to error:`, 
      error instanceof Error ? error.message : error);
  }
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const { initialDelayMs = 100, backoffFactor = 2, maxDelayMs = 5000, jitterFactor = 0.2 } = options;
  
  // Calculate base delay using exponential backoff
  const baseDelay = Math.min(
    initialDelayMs * Math.pow(backoffFactor, attempt),
    maxDelayMs
  );
  
  // Apply jitter to prevent thundering herd problem
  if (jitterFactor > 0) {
    const jitter = baseDelay * jitterFactor;
    return baseDelay - jitter + (Math.random() * jitter * 2);
  }
  
  return baseDelay;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn The function to retry (can be async)
 * @param options Retry configuration options
 * @returns Promise resolving to the result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T> | T,
  options: RetryOptions = {}
): Promise<T> {
  // Merge provided options with defaults
  const retryOptions: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const { maxRetries = 3, isRetriableError, onRetry } = retryOptions;
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we've reached max retries
      if (attempt >= maxRetries) {
        break;
      }
      
      // Check if error is retriable
      if (isRetriableError && !isRetriableError(error)) {
        // Non-retriable error, immediately fail
        throw error;
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, retryOptions);
      
      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, we've exhausted all retries
  throw lastError;
}

/**
 * Create a wrapped version of a function with built-in retry logic
 * 
 * @param fn The function to wrap with retry logic
 * @param options Retry configuration options
 * @returns A new function that will retry on failure
 */
export function createRetryFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    return withRetry(() => fn(...args), options) as ReturnType<T>;
  }) as T;
} 