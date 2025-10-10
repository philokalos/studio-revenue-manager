import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting configuration for different endpoint types
 */

// Whitelist for internal services (if needed)
const WHITELIST_IPS: string[] = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];

/**
 * Check if IP should be whitelisted from rate limiting
 */
const shouldSkip = (req: Request): boolean => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  return WHITELIST_IPS.includes(clientIp);
};

/**
 * Custom error message handler
 */
const rateLimitMessage = (type: string, limit: number, windowMinutes: number) => ({
  error: 'Too many requests',
  message: `You have exceeded the ${limit} requests in ${windowMinutes} minutes limit for ${type} endpoints.`,
  retryAfter: `Please try again later.`,
});

/**
 * Authentication endpoints rate limiter
 * Stricter limits to prevent brute force attacks
 * 5 requests per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: rateLimitMessage('authentication', 5, 15),
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: shouldSkip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitMessage('authentication', 5, 15));
  },
});

/**
 * API endpoints rate limiter
 * Standard limits for regular API usage
 * 100 requests per 15 minutes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: rateLimitMessage('API', 100, 15),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitMessage('API', 100, 15));
  },
});

/**
 * Public endpoints rate limiter
 * Moderate limits for public-facing endpoints
 * 20 requests per 15 minutes
 */
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: rateLimitMessage('public', 20, 15),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitMessage('public', 20, 15));
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per 15 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: rateLimitMessage('sensitive', 3, 15),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitMessage('sensitive', 3, 15));
  },
});

/**
 * General rate limiter for unspecified endpoints
 * 60 requests per 15 minutes
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  message: rateLimitMessage('general', 60, 15),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitMessage('general', 60, 15));
  },
});
