/**
 * Quotes Collection Schema
 * Firestore path: /quotes/{quoteId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Quote {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  headcount: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax?: number;
  totalAmount: number;
  validUntil: Timestamp;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  notes?: string;

  // Conversion tracking
  reservationId?: string;  // If converted to reservation

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: Timestamp;
  respondedAt?: Timestamp;
}

/**
 * Security Rules:
 * - Read: Authenticated users
 * - Create/Update: Staff or admin
 * - Delete: Admin only
 */

/**
 * Composite Indexes:
 * 1. status + createdAt (DESC)
 * 2. customerEmail + createdAt (DESC)
 * 3. status + validUntil (ASC)
 */

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const;

export type QuoteStatus = typeof QUOTE_STATUSES[number];

export const DEFAULT_QUOTE: Partial<Quote> = {
  status: 'DRAFT',
  lineItems: [],
  subtotal: 0,
  totalAmount: 0,
};
