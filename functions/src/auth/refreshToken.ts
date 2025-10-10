/**
 * Refresh Token Function
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { verifyToken } from '../utils/auth';

export const refreshToken = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify current token
      const user = await verifyToken(request);

      // Get updated user data from Firestore
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (!userDoc.exists) {
        response.status(404).json(errorResponse('User not found'));
        return;
      }

      const userData = userDoc.data();

      // Generate new custom token
      const newToken = await admin.auth().createCustomToken(user.uid);

      response.status(200).json(successResponse({
        uid: user.uid,
        email: user.email,
        name: userData?.name,
        role: userData?.role || 'customer',
        token: newToken,
      }, 'Token refreshed successfully'));

    } catch (error) {
      console.error('Token refresh error:', error);
      response.status(401).json(errorResponse(handleError(error)));
    }
  }
);
