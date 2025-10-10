import cors, { CorsOptions } from 'cors';

/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * Environment-based configuration for development and production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  if (isDevelopment) {
    // Development: Allow localhost on various ports
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];
  }

  // Production: Use environment variable or default
  const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  return productionOrigins.map((origin) => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

/**
 * CORS origin validation
 */
const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  // Allow requests with no origin (like mobile apps, Postman, curl)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  }
};

/**
 * CORS configuration options
 */
const corsOptions: CorsOptions = {
  // Origin validation
  origin: isDevelopment ? true : corsOriginValidator,

  // Credentials support (cookies, authorization headers, TLS client certificates)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-HTTP-Method-Override',
    'Accept',
    'Origin',
  ],

  // Exposed headers (available to client-side code)
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'Content-Range',
  ],

  // Preflight cache duration (seconds)
  maxAge: 86400, // 24 hours

  // Success status for preflight requests
  optionsSuccessStatus: 204,

  // Pass preflight response to next handler
  preflightContinue: false,
};

/**
 * CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Manual CORS headers (fallback/additional layer)
 */
export const additionalCorsHeaders = (
  req: any,
  res: any,
  next: any
): void => {
  const origin = req.headers.origin;

  // Set origin if allowed
  if (!origin || allowedOrigins.includes(origin) || isDevelopment) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

export { allowedOrigins };
