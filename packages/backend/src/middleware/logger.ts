import { Request, Response, NextFunction } from 'express';

// Request logging middleware
export const logger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log request
  console.log(`➡️  ${req.method} ${req.path}`);

  // Capture the original res.send function
  const originalSend = res.send;

  // Override res.send to log response
  res.send = function (body: any): Response {
    const duration = Date.now() - start;
    console.log(`⬅️  ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);

    // Call the original send function
    return originalSend.call(this, body);
  };

  next();
};

// Detailed request logger (optional, for debugging)
export const detailedLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
