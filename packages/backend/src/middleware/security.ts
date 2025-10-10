import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers configuration using Helmet.js
 * Comprehensive security hardening for production environments
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy (CSP) configuration
 */
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust based on your needs
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: isDevelopment ? [] : null,
  },
};

/**
 * Helmet security configuration
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: isDevelopment ? false : contentSecurityPolicy,

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Frameguard (X-Frame-Options)
  frameguard: {
    action: 'deny', // Prevents clickjacking
  },

  // Hide Powered-By header
  hidePoweredBy: true,

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // Don't Sniff Mimetype
  noSniff: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-XSS-Protection
  xssFilter: true,
});

/**
 * Additional security headers middleware
 * Add custom headers and remove sensitive information
 */
export const additionalSecurityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove X-Powered-By header (backup in case helmet doesn't catch it)
  res.removeHeader('X-Powered-By');

  // Custom server header (obscure server details)
  res.setHeader('Server', 'StudioRM');

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ')
  );

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options (additional layer)
  res.setHeader('X-Frame-Options', 'DENY');

  // Cross-Origin policies
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
};

/**
 * Security middleware bundle
 * Combines all security measures
 */
export const securityMiddleware = [helmetConfig, additionalSecurityHeaders];
