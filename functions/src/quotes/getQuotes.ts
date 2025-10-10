/**
 * Get Quotes Function
 * Lists quotes with filtering (authenticated users)
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyToken } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateQuoteStatus } from '../utils/validation';

export const getQuotes = onRequest(
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

      // Extract query parameters
      const status = request.query.status as string | undefined;
      const customerEmail = request.query.customerEmail as string | undefined;
      const startDate = request.query.startDate as string | undefined;
      const endDate = request.query.endDate as string | undefined;
      const limitParam = request.query.limit as string | undefined;

      // Validate limit (default: 50, max: 100)
      let limit = 50;
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          response.status(400).json(errorResponse('Invalid limit parameter'));
          return;
        }
        limit = Math.min(parsedLimit, 100);
      }

      // Validate status filter
      if (status && !validateQuoteStatus(status)) {
        response.status(400).json(errorResponse('Invalid status value'));
        return;
      }

      // Build Firestore query
      let query: admin.firestore.Query = admin.firestore().collection('quotes');

      // Apply status filter
      if (status) {
        query = query.where('status', '==', status);
      }

      // Apply customerEmail filter
      if (customerEmail) {
        query = query.where('customerEmail', '==', customerEmail);
      }

      // Apply date range filters
      if (startDate) {
        const startDateTime = new Date(startDate);
        if (isNaN(startDateTime.getTime())) {
          response.status(400).json(errorResponse('Invalid startDate format'));
          return;
        }
        query = query.where('startTime', '>=', admin.firestore.Timestamp.fromDate(startDateTime));
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        if (isNaN(endDateTime.getTime())) {
          response.status(400).json(errorResponse('Invalid endDate format'));
          return;
        }
        query = query.where('endTime', '<=', admin.firestore.Timestamp.fromDate(endDateTime));
      }

      // Order by createdAt descending and apply limit
      query = query.orderBy('createdAt', 'desc').limit(limit);

      // Execute query
      const snapshot = await query.get();

      // Convert documents to array
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      response.status(200).json(successResponse({
        quotes,
        count: quotes.length,
        limit,
      }));

    } catch (error) {
      console.error('Get quotes error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
