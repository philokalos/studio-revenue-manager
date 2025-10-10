import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// Performance thresholds
const RESPONSE_TIME_THRESHOLD = 1000; // 1 second
const MEMORY_WARNING_THRESHOLD = 0.8; // 80% of heap limit

// Performance metrics
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  totalResponseTime: number;
}

const metrics: PerformanceMetrics = {
  requestCount: 0,
  averageResponseTime: 0,
  slowRequests: 0,
  totalResponseTime: 0,
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  // Capture original end function
  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate response time
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    // Calculate memory usage
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
    };

    // Update metrics
    metrics.requestCount++;
    metrics.totalResponseTime += duration;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.requestCount;

    const isSlow = duration > RESPONSE_TIME_THRESHOLD;
    if (isSlow) {
      metrics.slowRequests++;
    }

    // Log slow requests
    if (isSlow) {
      logger.warn('Slow Request Detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: Math.round(duration),
        threshold: RESPONSE_TIME_THRESHOLD,
        memoryDelta: {
          heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryDelta.external / 1024 / 1024).toFixed(2)} MB`,
        },
      });
    }

    // Log all performance data in debug mode
    logger.debug('Request Performance', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      duration: Math.round(duration),
      memoryDelta: {
        heapUsed: memoryDelta.heapUsed,
        external: memoryDelta.external,
      },
    });

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

// Get performance metrics
export const getPerformanceMetrics = (): PerformanceMetrics & { memory: NodeJS.MemoryUsage } => {
  return {
    ...metrics,
    memory: process.memoryUsage(),
  };
};

// Reset performance metrics
export const resetPerformanceMetrics = (): void => {
  metrics.requestCount = 0;
  metrics.averageResponseTime = 0;
  metrics.slowRequests = 0;
  metrics.totalResponseTime = 0;
};

// Monitor memory usage
export const monitorMemory = (): void => {
  const usage = process.memoryUsage();
  const heapUsedPercent = usage.heapUsed / usage.heapTotal;

  if (heapUsedPercent > MEMORY_WARNING_THRESHOLD) {
    logger.warn('High Memory Usage Detected', {
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsedPercent: `${(heapUsedPercent * 100).toFixed(2)}%`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    });
  }
};

// Monitor event loop lag
export const monitorEventLoop = (): void => {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    if (lag > 100) {
      // More than 100ms lag
      logger.warn('Event Loop Lag Detected', {
        lag,
        threshold: 100,
      });
    }
  });
};

// Start periodic monitoring
export const startPerformanceMonitoring = (intervalMs: number = 30000): NodeJS.Timeout => {
  return setInterval(() => {
    monitorMemory();
    monitorEventLoop();

    if (metrics.requestCount > 0) {
      logger.info('Performance Metrics', {
        period: `${intervalMs / 1000}s`,
        ...metrics,
        averageResponseTime: Math.round(metrics.averageResponseTime),
      });
    }
  }, intervalMs);
};
