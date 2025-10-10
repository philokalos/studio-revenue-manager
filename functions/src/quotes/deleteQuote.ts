/**
 * Delete Quote Function
 * Deletes a quote (admin only)
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyToken, requireAdmin } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

interface DeleteQuoteRequest {
  id: string;
}

export const deleteQuote = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept DELETE requests
      if (request.method !== 'DELETE') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and require admin role
      const user = await verifyToken(request);
      requireAdmin(user);

      // Extract quote ID from query parameter or request body
      const quoteId = (request.query.id as string) || (request.body as DeleteQuoteRequest)?.id;

      if (!quoteId) {
        response.status(400).json(errorResponse('Quote ID is required'));
        return;
      }

      // Fetch quote document to check if it exists
      const quoteRef = admin.firestore().collection('quotes').doc(quoteId);
      const quoteDoc = await quoteRef.get();

      if (!quoteDoc.exists) {
        response.status(404).json(errorResponse('Quote not found'));
        return;
      }

      // Check if quote is linked to a reservation
      const quoteData = quoteDoc.data();
      if (quoteData?.reservationId) {
        response.status(400).json(errorResponse(
          'Cannot delete quote linked to a reservation. Remove the link first.'
        ));
        return;
      }

      // Delete the quote
      await quoteRef.delete();

      response.status(200).json(successResponse(
        { id: quoteId },
        'Quote deleted successfully'
      ));

    } catch (error) {
      console.error('Delete quote error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse(errorMessage));
      } else if (errorMessage.includes('permission-denied')) {
        response.status(403).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
