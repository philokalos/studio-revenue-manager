/**
 * User Login Function
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired, validateEmail } from '../utils/validation';

interface LoginRequest {
  email: string;
  password: string;
}

export const login = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      const data = request.body as LoginRequest;

      // Validate required fields
      validateRequired(data, ['email', 'password']);

      // Validate email format
      if (!validateEmail(data.email)) {
        response.status(400).json(errorResponse('Invalid email format'));
        return;
      }

      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(data.email);

      // Get user data from Firestore
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userRecord.uid)
        .get();

      if (!userDoc.exists) {
        response.status(404).json(errorResponse('User not found'));
        return;
      }

      const userData = userDoc.data();

      // Generate custom token
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      response.status(200).json(successResponse({
        uid: userRecord.uid,
        email: userRecord.email,
        name: userData?.name,
        role: userData?.role || 'customer',
        token: customToken,
      }, 'Login successful'));

    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('user-not-found')) {
        response.status(404).json(errorResponse('User not found'));
      } else {
        response.status(401).json(errorResponse('Invalid credentials'));
      }
    }
  }
);
