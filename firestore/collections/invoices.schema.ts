/**
 * Invoices Collection Schema
 * Firestore path: /invoices/{invoiceId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface DiscountLog {
  appliedBy: string;
  appliedAt: Timestamp;
  discountType: 'amount' | 'rate';
  discountValue: number;
}

export interface Invoice {
  id: string;
  reservationId: string;
  expectedAmount: number;
  discountType?: 'amount' | 'rate';
  discountValue?: number;
  discountAmount: number;
  finalAmount: number;
  status: 'OPEN' | 'PAID' | 'PARTIAL' | 'VOID';

  // Payment tracking
  paidAmount?: number;
  paymentDate?: Timestamp;
  paymentMethod?: string;

  // Discount history (subcollection alternative)
  discountLogs: DiscountLog[];

  // Due date
  dueDate?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Security Rules:
 * - Read: Authenticated users
 * - Create/Update: Staff or admin
 * - Delete: Admin only
 */

/**
 * Composite Indexes:
 * 1. status + dueDate (ASC)
 * 2. reservationId + createdAt (DESC)
 * 3. status + createdAt (DESC)
 */

export const INVOICE_STATUSES = ['OPEN', 'PAID', 'PARTIAL', 'VOID'] as const;
export const DISCOUNT_TYPES = ['amount', 'rate'] as const;

export type InvoiceStatus = typeof INVOICE_STATUSES[number];
export type DiscountType = typeof DISCOUNT_TYPES[number];

export const DEFAULT_INVOICE: Partial<Invoice> = {
  status: 'OPEN',
  discountAmount: 0,
  discountLogs: [],
};
