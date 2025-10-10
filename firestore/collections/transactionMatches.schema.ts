/**
 * Transaction Matches Collection Schema
 * Firestore path: /transactionMatches/{matchId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface TransactionMatch {
  id: string;
  transactionId: string;
  invoiceId: string;
  matchConfidence: number;  // 0.0 - 1.0
  matchReason: string;
  matchType: 'AUTO' | 'MANUAL';

  // Verification
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  verified: boolean;

  // Amount comparison
  transactionAmount: number;
  invoiceAmount: number;
  amountDifference: number;

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
 * 1. transactionId + createdAt (DESC)
 * 2. invoiceId + createdAt (DESC)
 * 3. verified + matchConfidence (DESC)
 * 4. matchType + createdAt (DESC)
 */

export const MATCH_TYPES = ['AUTO', 'MANUAL'] as const;

export type MatchType = typeof MATCH_TYPES[number];

export const DEFAULT_TRANSACTION_MATCH: Partial<TransactionMatch> = {
  verified: false,
  matchType: 'AUTO',
};
