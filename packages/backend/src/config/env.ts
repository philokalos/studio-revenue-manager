import dotenv from 'dotenv';

/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are set before starting the application
 */

// Load environment variables
dotenv.config();

/**
 * Environment variable schema
 */
interface EnvConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Security
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_WHITELIST?: string;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;

  // Google
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;

  // File Upload
  MAX_FILE_SIZE?: number;
  UPLOAD_DIR?: string;
}

/**
 * Parse boolean from string
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse integer from string
 */
const parseInteger = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
};

/**
 * Get required environment variable
 */
const getRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Get optional environment variable
 */
const getOptional = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

/**
 * Validate NODE_ENV
 */
const validateNodeEnv = (): 'development' | 'production' | 'test' => {
  const env = process.env.NODE_ENV;
  if (env !== 'development' && env !== 'production' && env !== 'test') {
    console.warn(`Invalid NODE_ENV: ${env}. Defaulting to 'development'`);
    return 'development';
  }
  return env;
};

/**
 * Validate and load environment configuration
 */
export const validateEnv = (): EnvConfig => {
  try {
    const config: EnvConfig = {
      // Server
      NODE_ENV: validateNodeEnv(),
      PORT: parseInteger(process.env.PORT, 3000),

      // Database
      DB_HOST: getRequired('DB_HOST'),
      DB_PORT: parseInteger(process.env.DB_PORT, 5432),
      DB_NAME: getRequired('DB_NAME'),
      DB_USER: getRequired('DB_USER'),
      DB_PASSWORD: getRequired('DB_PASSWORD'),
      DB_SSL: parseBoolean(process.env.DB_SSL, false),

      // JWT
      JWT_SECRET: getRequired('JWT_SECRET'),
      JWT_EXPIRES_IN: getOptional('JWT_EXPIRES_IN', '1h'),
      JWT_REFRESH_SECRET: getRequired('JWT_REFRESH_SECRET'),
      JWT_REFRESH_EXPIRES_IN: getOptional('JWT_REFRESH_EXPIRES_IN', '7d'),

      // Security
      ALLOWED_ORIGINS: getOptional('ALLOWED_ORIGINS'),
      RATE_LIMIT_WHITELIST: getOptional('RATE_LIMIT_WHITELIST'),

      // Email (optional)
      SMTP_HOST: getOptional('SMTP_HOST'),
      SMTP_PORT: parseInteger(process.env.SMTP_PORT, 587),
      SMTP_USER: getOptional('SMTP_USER'),
      SMTP_PASS: getOptional('SMTP_PASS'),
      SMTP_FROM: getOptional('SMTP_FROM'),

      // Google (optional)
      GOOGLE_CLIENT_ID: getOptional('GOOGLE_CLIENT_ID'),
      GOOGLE_CLIENT_SECRET: getOptional('GOOGLE_CLIENT_SECRET'),
      GOOGLE_REDIRECT_URI: getOptional('GOOGLE_REDIRECT_URI'),

      // File Upload (optional)
      MAX_FILE_SIZE: parseInteger(process.env.MAX_FILE_SIZE, 5242880), // 5MB default
      UPLOAD_DIR: getOptional('UPLOAD_DIR', './uploads'),
    };

    // Validate JWT secrets in production
    if (config.NODE_ENV === 'production') {
      if (config.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
      if (config.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
      }
    }

    return config;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
};

/**
 * Export validated configuration
 */
export const env = validateEnv();

/**
 * Print configuration summary (hide sensitive data)
 */
export const printEnvSummary = (): void => {
  console.log('\n📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   PORT: ${env.PORT}`);
  console.log(`   DB_HOST: ${env.DB_HOST}`);
  console.log(`   DB_PORT: ${env.DB_PORT}`);
  console.log(`   DB_NAME: ${env.DB_NAME}`);
  console.log(`   DB_SSL: ${env.DB_SSL}`);
  console.log(`   JWT_EXPIRES_IN: ${env.JWT_EXPIRES_IN}`);
  console.log(`   JWT_REFRESH_EXPIRES_IN: ${env.JWT_REFRESH_EXPIRES_IN}`);
  if (env.ALLOWED_ORIGINS) {
    console.log(`   ALLOWED_ORIGINS: ${env.ALLOWED_ORIGINS.split(',').length} origin(s)`);
  }
  if (env.SMTP_HOST) {
    console.log(`   SMTP configured: Yes`);
  }
  if (env.GOOGLE_CLIENT_ID) {
    console.log(`   Google OAuth configured: Yes`);
  }
  console.log('');
};

export default env;
