import logger from '../config/logger';

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = 1000;

// Query statistics
interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
}

const queryStats: QueryStats = {
  totalQueries: 0,
  slowQueries: 0,
  failedQueries: 0,
  averageExecutionTime: 0,
};

// Helper function to sanitize query parameters
const sanitizeParams = (params: any[]): any[] => {
  if (!params || params.length === 0) return [];

  return params.map((param) => {
    if (typeof param === 'string' && param.length > 100) {
      return param.substring(0, 100) + '... [truncated]';
    }
    return param;
  });
};

// Log query execution
export const logQuery = (query: string, params: any[], duration: number, requestId?: string): void => {
  const isSlow = duration > SLOW_QUERY_THRESHOLD;

  // Update statistics
  queryStats.totalQueries++;
  if (isSlow) {
    queryStats.slowQueries++;
  }
  queryStats.averageExecutionTime =
    (queryStats.averageExecutionTime * (queryStats.totalQueries - 1) + duration) / queryStats.totalQueries;

  // Log slow queries
  if (isSlow) {
    logger.warn('Slow Query Detected', {
      requestId,
      query: query.trim().replace(/\s+/g, ' '),
      params: sanitizeParams(params),
      duration,
      threshold: SLOW_QUERY_THRESHOLD,
    });
  } else {
    // Log all queries in debug mode
    logger.debug('Database Query', {
      requestId,
      query: query.trim().replace(/\s+/g, ' '),
      params: sanitizeParams(params),
      duration,
    });
  }
};

// Log query error
export const logQueryError = (
  query: string,
  params: any[],
  error: Error,
  requestId?: string
): void => {
  queryStats.failedQueries++;

  logger.error('Database Query Failed', {
    requestId,
    query: query.trim().replace(/\s+/g, ' '),
    params: sanitizeParams(params),
    error: error.message,
    stack: error.stack,
  });
};

// Get query statistics
export const getQueryStats = (): QueryStats => {
  return { ...queryStats };
};

// Reset query statistics
export const resetQueryStats = (): void => {
  queryStats.totalQueries = 0;
  queryStats.slowQueries = 0;
  queryStats.failedQueries = 0;
  queryStats.averageExecutionTime = 0;
};

// Log query statistics periodically
export const logQueryStatsPeriodically = (intervalMs: number = 60000): NodeJS.Timeout => {
  return setInterval(() => {
    if (queryStats.totalQueries > 0) {
      logger.info('Database Query Statistics', {
        period: `${intervalMs / 1000}s`,
        ...queryStats,
      });
    }
  }, intervalMs);
};
