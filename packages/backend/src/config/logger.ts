import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about our colors
winston.addColors(colors);

// Determine log level based on environment
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format for development (colorized)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${
      info.stack ? '\n' + info.stack : ''
    }${
      Object.keys(info).filter(key => !['timestamp', 'level', 'message', 'stack'].includes(key)).length > 0
        ? '\n' + JSON.stringify(
            Object.fromEntries(
              Object.entries(info).filter(([key]) => !['timestamp', 'level', 'message', 'stack'].includes(key))
            ),
            null,
            2
          )
        : ''
    }`
  )
);

// Define log format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

// Console transport
const consoleTransport = new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
});

// File transport for all logs (daily rotation)
const allLogsTransport: DailyRotateFile = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFormat,
});

// File transport for error logs only (daily rotation)
const errorLogsTransport: DailyRotateFile = new DailyRotateFile({
  level: 'error',
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFormat,
});

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [consoleTransport, allLogsTransport, errorLogsTransport],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// Helper function to create child logger with additional context
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// Export the logger
export default logger;
