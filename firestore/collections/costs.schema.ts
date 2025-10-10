/**
 * Costs Collection Schema (Monthly aggregation)
 * Firestore path: /costs/{costId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface ChannelBreakdown {
  [channelName: string]: number;
}

export interface Cost {
  id: string;
  month: string;  // Format: YYYY-MM (e.g., "2025-01")
  rent: number;
  utilities: number;
  adsTotal: number;
  supplies: number;
  maintenance: number;
  channelBreakdown?: ChannelBreakdown;
  description?: string;

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
 * Indexes:
 * 1. month (DESC) - single field
 */

export const COST_CATEGORIES = [
  'rent',
  'utilities',
  'adsTotal',
  'supplies',
  'maintenance',
] as const;

export type CostCategory = typeof COST_CATEGORIES[number];

export const DEFAULT_COST: Partial<Cost> = {
  rent: 0,
  utilities: 0,
  adsTotal: 0,
  supplies: 0,
  maintenance: 0,
};
