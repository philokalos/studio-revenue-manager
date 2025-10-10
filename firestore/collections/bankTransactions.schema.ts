/**
 * Bank Transactions Collection Schema
 * Firestore path: /bankTransactions/{transactionId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface BankTransaction {
  id: string;
  transactionDate: Timestamp;
  amount: number;
  depositorName?: string;
  memo?: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';

  // Matching
  matchedInvoiceId?: string;
  status: 'UNMATCHED' | 'MATCHED' | 'PENDING_REVIEW';

  // Raw CSV data for audit
  rawData: {
    [key: string]: any;
  };

  // Uploaded by
  uploadedBy: string;
  uploadedAt: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Security Rules:
 * - Read: Staff or admin
 * - Create/Update/Delete: Admin only
 */

/**
 * Composite Indexes:
 * 1. status + transactionDate (DESC)
 * 2. transactionType + transactionDate (DESC)
 * 3. matchedInvoiceId + transactionDate (DESC)
 */

export const TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAWAL'] as const;
export const TRANSACTION_STATUSES = ['UNMATCHED', 'MATCHED', 'PENDING_REVIEW'] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

export const DEFAULT_BANK_TRANSACTION: Partial<BankTransaction> = {
  status: 'UNMATCHED',
  rawData: {},
};
