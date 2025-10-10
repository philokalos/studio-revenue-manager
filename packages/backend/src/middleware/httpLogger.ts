import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Paths to exclude from logging (health checks, static assets, etc.)
const excludedPaths = ['/api/health', '/favicon.ico', '/api-docs'];

// HTTP Request Logger Middleware
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;

  // Skip logging for excluded paths
  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const startTime = Date.now();

  // Log request
  logger.http('HTTP Request', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id, // If auth middleware sets user
  });

  // Capture original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    let logLevel: 'error' | 'warn' | 'info' | 'http' = 'http';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    } else if (statusCode >= 300) {
      logLevel = 'info';
    }

    // Log response
    logger[logLevel]('HTTP Response', {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode,
      duration,
      contentLength: res.get('content-length'),
      userId: (req as any).user?.id,
    });

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

// Detailed request logger for debugging (logs request body)
export const detailedHttpLogger = (req: Request, _res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  logger.debug('Detailed HTTP Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next();
};
