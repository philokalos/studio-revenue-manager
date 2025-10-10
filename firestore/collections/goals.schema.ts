/**
 * Goals Collection Schema (Monthly targets)
 * Firestore path: /goals/{goalId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface Goal {
  id: string;
  month: string;  // Format: YYYY-MM (e.g., "2025-01")
  revenueTarget: number;
  notifiedAt?: Timestamp;

  // Achievement tracking
  actualRevenue?: number;
  achievementRate?: number;  // 0.0 - 1.0+

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
 * Indexes:
 * 1. month (DESC) - single field
 */

export const DEFAULT_GOAL: Partial<Goal> = {
  actualRevenue: 0,
  achievementRate: 0,
};
