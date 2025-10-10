/**
 * Get Quote Function
 * Gets a single quote by ID (authenticated users)
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyToken } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const getQuote = onRequest(
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

      // Extract quote ID from query parameter or URL path
      const quoteId = request.query.id as string || request.path.split('/').pop();

      if (!quoteId) {
        response.status(400).json(errorResponse('Quote ID is required'));
        return;
      }

      // Fetch quote document
      const quoteDoc = await admin.firestore()
        .collection('quotes')
        .doc(quoteId)
        .get();

      if (!quoteDoc.exists) {
        response.status(404).json(errorResponse('Quote not found'));
        return;
      }

      const quoteData = {
        id: quoteDoc.id,
        ...quoteDoc.data(),
      };

      response.status(200).json(successResponse(quoteData));

    } catch (error) {
      console.error('Get quote error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
