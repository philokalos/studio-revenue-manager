import logger from '../config/logger';

// Event types
export enum EventType {
  // User events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Reservation events
  RESERVATION_CREATED = 'reservation.created',
  RESERVATION_UPDATED = 'reservation.updated',
  RESERVATION_DELETED = 'reservation.deleted',
  RESERVATION_CANCELLED = 'reservation.cancelled',

  // Class events
  CLASS_CREATED = 'class.created',
  CLASS_UPDATED = 'class.updated',
  CLASS_DELETED = 'class.deleted',

  // System events
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  DATABASE_MIGRATION = 'database.migration',
  DATABASE_SEED = 'database.seed',

  // Import/Export events
  DATA_IMPORT = 'data.import',
  DATA_EXPORT = 'data.export',

  // Email events
  EMAIL_SENT = 'email.sent',
  EMAIL_FAILED = 'email.failed',

  // Error events
  ERROR_OCCURRED = 'error.occurred',
}

// Event severity levels
export enum EventSeverity {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Event data interface
interface EventData {
  type: EventType;
  severity?: EventSeverity;
  userId?: number;
  entityId?: number;
  entityType?: string;
  metadata?: Record<string, any>;
  message?: string;
  requestId?: string;
}

// Log business event
export const logEvent = (data: EventData): void => {
  const {
    type,
    severity = EventSeverity.INFO,
    userId,
    entityId,
    entityType,
    metadata,
    message,
    requestId,
  } = data;

  const eventLog = {
    eventType: type,
    timestamp: new Date().toISOString(),
    userId,
    entityId,
    entityType,
    requestId,
    ...metadata,
  };

  switch (severity) {
    case EventSeverity.ERROR:
      logger.error(message || `Event: ${type}`, eventLog);
      break;
    case EventSeverity.WARN:
      logger.warn(message || `Event: ${type}`, eventLog);
      break;
    case EventSeverity.INFO:
    default:
      logger.info(message || `Event: ${type}`, eventLog);
      break;
  }
};

// Convenience functions for common events

export const logUserLogin = (userId: number, requestId?: string): void => {
  logEvent({
    type: EventType.USER_LOGIN,
    userId,
    requestId,
    message: 'User logged in successfully',
  });
};

export const logUserLogout = (userId: number, requestId?: string): void => {
  logEvent({
    type: EventType.USER_LOGOUT,
    userId,
    requestId,
    message: 'User logged out',
  });
};

export const logReservationCreated = (
  reservationId: number,
  userId: number,
  metadata?: Record<string, any>,
  requestId?: string
): void => {
  logEvent({
    type: EventType.RESERVATION_CREATED,
    userId,
    entityId: reservationId,
    entityType: 'reservation',
    metadata,
    requestId,
    message: 'New reservation created',
  });
};

export const logReservationUpdated = (
  reservationId: number,
  userId: number,
  metadata?: Record<string, any>,
  requestId?: string
): void => {
  logEvent({
    type: EventType.RESERVATION_UPDATED,
    userId,
    entityId: reservationId,
    entityType: 'reservation',
    metadata,
    requestId,
    message: 'Reservation updated',
  });
};

export const logSystemStartup = (): void => {
  logEvent({
    type: EventType.SYSTEM_STARTUP,
    message: 'Application started',
    metadata: {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV,
    },
  });
};

export const logSystemShutdown = (): void => {
  logEvent({
    type: EventType.SYSTEM_SHUTDOWN,
    message: 'Application shutting down',
  });
};

export const logDatabaseMigration = (success: boolean, error?: string): void => {
  logEvent({
    type: EventType.DATABASE_MIGRATION,
    severity: success ? EventSeverity.INFO : EventSeverity.ERROR,
    message: success ? 'Database migration completed' : 'Database migration failed',
    metadata: { success, error },
  });
};

export const logDataImport = (
  entityType: string,
  count: number,
  userId?: number,
  requestId?: string
): void => {
  logEvent({
    type: EventType.DATA_IMPORT,
    userId,
    entityType,
    requestId,
    message: `Imported ${count} ${entityType} records`,
    metadata: { count },
  });
};

export const logEmailSent = (to: string, subject: string, requestId?: string): void => {
  logEvent({
    type: EventType.EMAIL_SENT,
    requestId,
    message: 'Email sent successfully',
    metadata: { to, subject },
  });
};

export const logEmailFailed = (to: string, subject: string, error: string, requestId?: string): void => {
  logEvent({
    type: EventType.EMAIL_FAILED,
    severity: EventSeverity.ERROR,
    requestId,
    message: 'Failed to send email',
    metadata: { to, subject, error },
  });
};
