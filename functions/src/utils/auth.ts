/**
 * Authentication utilities
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';

export interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
}

/**
 * Verify and decode ID token
 */
export async function verifyToken(request: https.Request): Promise<AuthUser> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new https.HttpsError('unauthenticated', 'Missing or invalid authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      throw new https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();

    return {
      uid: decodedToken.uid,
      email: decodedToken.email!,
      role: userData?.role || 'customer',
    };
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    throw new https.HttpsError('unauthenticated', 'Invalid token');
  }
}

/**
 * Check if user has required role
 */
export function requireRole(user: AuthUser, allowedRoles: Array<'admin' | 'staff' | 'customer'>): void {
  if (!allowedRoles.includes(user.role)) {
    throw new https.HttpsError('permission-denied', 'Insufficient permissions');
  }
}

/**
 * Check if user is admin
 */
export function requireAdmin(user: AuthUser): void {
  requireRole(user, ['admin']);
}

/**
 * Check if user is staff or admin
 */
export function requireStaff(user: AuthUser): void {
  requireRole(user, ['admin', 'staff']);
}
