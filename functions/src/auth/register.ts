/**
 * User Registration Function
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired, validateEmail } from '../utils/validation';

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export const register = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      const data = request.body as RegisterRequest;

      // Validate required fields
      validateRequired(data, ['email', 'password', 'name']);

      // Validate email format
      if (!validateEmail(data.email)) {
        response.status(400).json(errorResponse('Invalid email format'));
        return;
      }

      // Validate password length
      if (data.password.length < 6) {
        response.status(400).json(errorResponse('Password must be at least 6 characters'));
        return;
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: data.email,
        password: data.password,
        displayName: data.name,
      });

      // Set custom claims (default role: customer)
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'customer' });

      // Create Firestore user document
      await admin.firestore()
        .collection('users')
        .doc(userRecord.uid)
        .set({
          uid: userRecord.uid,
          email: data.email,
          name: data.name,
          role: 'customer',
          phone: data.phone || null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Generate custom token for immediate login
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      response.status(201).json(successResponse({
        uid: userRecord.uid,
        email: data.email,
        name: data.name,
        role: 'customer',
        token: customToken,
      }, 'User registered successfully'));

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('email-already-exists')) {
        response.status(409).json(errorResponse('Email already exists'));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
