/**
 * Calendar Sync Log Collection Schema
 * Firestore path: /calendarSyncLog/{syncId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface CalendarSyncLog {
  id: string;
  reservationId: string;
  calendarEventId: string;
  syncDirection: 'TO_CALENDAR' | 'FROM_CALENDAR';
  syncStatus: 'SUCCESS' | 'FAILED' | 'DELETED';
  errorMessage?: string;
  syncedAt: Timestamp;

  // Change tracking
  changeType?: 'CREATE' | 'UPDATE' | 'DELETE';
  changedFields?: string[];

  // Timestamps
  createdAt: Timestamp;
}

/**
 * Security Rules:
 * - Read: Staff or admin
 * - Create/Update: Staff or admin
 * - Delete: Admin only
 */

/**
 * Composite Indexes:
 * 1. reservationId + syncedAt (DESC)
 * 2. syncStatus + syncedAt (DESC)
 * 3. syncDirection + syncedAt (DESC)
 */

export const SYNC_DIRECTIONS = ['TO_CALENDAR', 'FROM_CALENDAR'] as const;
export const SYNC_STATUSES = ['SUCCESS', 'FAILED', 'DELETED'] as const;
export const CHANGE_TYPES = ['CREATE', 'UPDATE', 'DELETE'] as const;

export type SyncDirection = typeof SYNC_DIRECTIONS[number];
export type SyncStatus = typeof SYNC_STATUSES[number];
export type ChangeType = typeof CHANGE_TYPES[number];
