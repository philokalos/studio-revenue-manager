/**
 * Reservations Collection Schema
 * Firestore path: /reservations/{reservationId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface HeadcountChange {
  timestamp: Timestamp;
  from: number;
  to: number;
  reason?: string;
}

export interface Reservation {
  id: string;
  googleCalendarEventId?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  initialHeadcount: number;
  headcountChanges: HeadcountChange[];
  channel: 'default' | 'hourplace' | 'spacecloud';
  status: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  needsCorrection: boolean;
  correctedAt?: Timestamp;

  // Metadata (denormalized)
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount: number;
  shootingPurpose?: string;

  // Customer info (denormalized for queries)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

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
 * 1. status + startTime (DESC)
 * 2. customerEmail + createdAt (DESC)
 * 3. channel + startTime (DESC)
 * 4. needsCorrection + createdAt (DESC)
 */

export const RESERVATION_CHANNELS = ['default', 'hourplace', 'spacecloud'] as const;
export const RESERVATION_STATUSES = ['CONFIRMED', 'CANCELLED'] as const;

export type ReservationChannel = typeof RESERVATION_CHANNELS[number];
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

export const DEFAULT_RESERVATION: Partial<Reservation> = {
  channel: 'default',
  status: 'CONFIRMED',
  needsCorrection: false,
  parkingCount: 0,
  headcountChanges: [],
};
