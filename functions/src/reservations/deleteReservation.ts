/**
 * Delete Reservation Function
 * DELETE /reservations/{id}
 * Auth: Admin only
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { verifyToken, requireAdmin } from '../utils/auth';

export const deleteReservation = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept DELETE requests
      if (request.method !== 'DELETE') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and authorization
      const user = await verifyToken(request);
      requireAdmin(user); // Admin only

      // Extract reservation ID from query parameter or path
      const reservationId = request.query.id as string ||
                           request.path.split('/').pop();

      if (!reservationId) {
        response.status(400).json(errorResponse('Reservation ID is required'));
        return;
      }

      // Check if reservation exists
      const reservationRef = admin.firestore()
        .collection('reservations')
        .doc(reservationId);

      const reservationDoc = await reservationRef.get();

      if (!reservationDoc.exists) {
        response.status(404).json(errorResponse('Reservation not found'));
        return;
      }

      // Delete the reservation
      await reservationRef.delete();

      response.status(200).json(successResponse(
        { id: reservationId },
        'Reservation deleted successfully'
      ));

    } catch (error) {
      console.error('Delete reservation error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse('Authentication required'));
      } else if (errorMessage.includes('permission-denied')) {
        response.status(403).json(errorResponse('Insufficient permissions'));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
