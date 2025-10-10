/**
 * Get Single Reservation Function
 * GET /reservations/{id}
 * Auth: Authenticated users
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { verifyToken } from '../utils/auth';

export const getReservation = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept GET requests
      if (request.method !== 'GET') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication
      await verifyToken(request);

      // Extract reservation ID from query parameter or path
      const reservationId = request.query.id as string ||
                           request.path.split('/').pop();

      if (!reservationId) {
        response.status(400).json(errorResponse('Reservation ID is required'));
        return;
      }

      // Fetch reservation from Firestore
      const reservationDoc = await admin.firestore()
        .collection('reservations')
        .doc(reservationId)
        .get();

      if (!reservationDoc.exists) {
        response.status(404).json(errorResponse('Reservation not found'));
        return;
      }

      const reservation = {
        id: reservationDoc.id,
        ...reservationDoc.data(),
      };

      response.status(200).json(successResponse(reservation));

    } catch (error) {
      console.error('Get reservation error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse('Authentication required'));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
