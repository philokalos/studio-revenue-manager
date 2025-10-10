/**
 * Database Retry Logic with Exponential Backoff
 * Track 2: Database Connection Pooling
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const defaultConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (random value between 0 and 25% of delay)
  const jitter = Math.random() * cappedDelay * 0.25;
  return cappedDelay + jitter;
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error: any): boolean => {
  if (!error) return false;

  // PostgreSQL error codes that are retryable
  const retryableCodes = [
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '57P03', // cannot_connect_now
    '53300', // too_many_connections
    '40001', // serialization_failure
    '40P01', // deadlock_detected
  ];

  // Check PostgreSQL error code
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // Check for network errors
  const retryableMessages = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ];

  const errorMessage = error.message || error.toString();
  return retryableMessages.some((msg) => errorMessage.includes(msg));
};

/**
 * Execute database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultConfig, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (!isRetryableError(error)) {
        console.error('Non-retryable database error:', error);
        throw error;
      }

      // Check if we have attempts left
      if (attempt === finalConfig.maxAttempts - 1) {
        console.error(`Database operation failed after ${finalConfig.maxAttempts} attempts:`, error);
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${finalConfig.maxAttempts}). ` +
        `Retrying in ${Math.round(delay)}ms...`,
        { error: error.message, code: error.code }
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Database operation failed with unknown error');
}

/**
 * Wrapper for pool.query with retry logic
 */
export async function queryWithRetry<T = any>(
  pool: any,
  text: string,
  params?: any[],
  config?: Partial<RetryConfig>
): Promise<T> {
  return withRetry(() => pool.query(text, params), config);
}

/**
 * Wrapper for pool.connect with retry logic
 */
export async function connectWithRetry(
  pool: any,
  config?: Partial<RetryConfig>
): Promise<any> {
  return withRetry(() => pool.connect(), config);
}
