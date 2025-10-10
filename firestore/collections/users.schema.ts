/**
 * Users Collection Schema
 * Firestore path: /users/{userId}
 */

import { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string;                    // Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'customer';
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Security Rules:
 * - Read: Authenticated users
 * - Create: Any authenticated user (self-registration)
 * - Update: Owner or admin
 * - Delete: Admin only
 */

/**
 * Indexes:
 * - email (auto-indexed)
 * - role + createdAt (composite)
 */

export const USER_ROLES = ['admin', 'staff', 'customer'] as const;

export type UserRole = typeof USER_ROLES[number];

export const DEFAULT_USER: Partial<User> = {
  role: 'customer',
};
