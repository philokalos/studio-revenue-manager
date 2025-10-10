import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to sanitize sensitive data from error context
const sanitizeErrorContext = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

// Error handler middleware
export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;
  let errorCategory = 'server_error';

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCategory = err.isOperational ? 'operational_error' : 'programming_error';
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorCategory = 'validation_error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    errorCategory = 'validation_error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    errorCategory = 'auth_error';
  }

  // Categorize by status code
  const is4xx = statusCode >= 400 && statusCode < 500;
  const is5xx = statusCode >= 500;

  // Build error context
  const errorContext = {
    requestId: req.requestId,
    errorCategory,
    statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: sanitizeErrorContext(req.body),
    params: req.params,
    query: req.query,
    ...(errors && { validationErrors: errors }),
  };

  // Log error based on severity
  if (is5xx) {
    // Server errors - critical
    logger.error('Server Error', {
      ...errorContext,
      stack: err.stack,
    });

    // For critical errors (500+), you could send notifications here
    // e.g., Slack, PagerDuty, email alerts
    if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
      // TODO: Implement critical error notifications
      logger.error('CRITICAL ERROR - Notification should be sent', {
        requestId: req.requestId,
        error: err.message,
      });
    }
  } else if (is4xx) {
    // Client errors - warning level
    logger.warn('Client Error', errorContext);
  } else {
    // Other errors
    logger.error('Unexpected Error', {
      ...errorContext,
      stack: err.stack,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(req.requestId && { requestId: req.requestId }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async error wrapper
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
