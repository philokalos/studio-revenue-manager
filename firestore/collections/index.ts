/**
 * Firestore Collections Export
 * Central export point for all collection schemas
 */

export * from './users.schema';
export * from './reservations.schema';
export * from './quotes.schema';
export * from './invoices.schema';
export * from './calendarSync.schema';
export * from './bankTransactions.schema';
export * from './transactionMatches.schema';
export * from './costs.schema';
export * from './goals.schema';
export * from './monthlySummaries.schema';

/**
 * Collection Names
 */
export const COLLECTIONS = {
  USERS: 'users',
  RESERVATIONS: 'reservations',
  QUOTES: 'quotes',
  INVOICES: 'invoices',
  CALENDAR_SYNC_LOG: 'calendarSyncLog',
  BANK_TRANSACTIONS: 'bankTransactions',
  TRANSACTION_MATCHES: 'transactionMatches',
  COSTS: 'costs',
  GOALS: 'goals',
  MONTHLY_SUMMARIES: 'monthlySummaries',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
