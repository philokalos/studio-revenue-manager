/**
 * Monthly Summaries Collection Schema (Cached aggregations)
 * Firestore path: /monthlySummaries/{summaryId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface MonthlySummary {
  id: string;
  month: string;  // Format: YYYY-MM (e.g., "2025-01")
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  utilizationRate: number;  // 0.0 - 1.0
  goalAchievementRate?: number;  // 0.0 - 1.0+

  // Detailed breakdowns
  reservationCount: number;
  averageReservationValue: number;
  channelBreakdown?: {
    [channel: string]: {
      revenue: number;
      count: number;
    };
  };

  // Last calculation
  lastCalculatedAt: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Security Rules:
 * - Read: Authenticated users
 * - Create/Update: System only (triggered functions)
 * - Delete: Admin only
 */

/**
 * Indexes:
 * 1. month (DESC) - single field
 */

export const DEFAULT_MONTHLY_SUMMARY: Partial<MonthlySummary> = {
  totalRevenue: 0,
  totalCosts: 0,
  netProfit: 0,
  utilizationRate: 0,
  reservationCount: 0,
  averageReservationValue: 0,
};
