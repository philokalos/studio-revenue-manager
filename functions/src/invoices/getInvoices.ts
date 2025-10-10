/**
 * Get Invoices Function
 * List invoices with filtering
 * Access: Authenticated users
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import { verifyToken } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateInvoiceStatus } from '../utils/validation';

export const getInvoices = https.onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (request, response) => {
    try {
      // Authentication
      await verifyToken(request);

      // Only allow GET
      if (request.method !== 'GET') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Extract query parameters
      const {
        status,
        reservationId,
        dueDate,
        limit = '50',
      } = request.query;

      // Validate and parse limit
      let parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        parsedLimit = 50;
      }
      if (parsedLimit > 100) {
        parsedLimit = 100;
      }

      // Build query
      let query: admin.firestore.Query = admin.firestore()
        .collection('invoices');

      // Apply filters
      if (status) {
        if (!validateInvoiceStatus(status as string)) {
          response.status(400).json(errorResponse('Invalid invoice status'));
          return;
        }
        query = query.where('status', '==', status);
      }

      if (reservationId) {
        query = query.where('reservationId', '==', reservationId);
      }

      if (dueDate) {
        try {
          // Query for invoices with dueDate on the specified date
          const startOfDay = new Date(dueDate as string);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dueDate as string);
          endOfDay.setHours(23, 59, 59, 999);

          query = query
            .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
            .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(endOfDay));
        } catch (error) {
          response.status(400).json(errorResponse('Invalid dueDate format'));
          return;
        }
      }

      // Order by createdAt descending and apply limit
      query = query.orderBy('createdAt', 'desc').limit(parsedLimit);

      // Execute query
      const snapshot = await query.get();

      // Format results
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      response.status(200).json(
        successResponse({
          invoices,
          count: invoices.length,
          limit: parsedLimit,
        })
      );
    } catch (error) {
      console.error('Error fetching invoices:', error);

      if (error instanceof https.HttpsError) {
        const statusCode = error.code === 'unauthenticated' ? 401 : 400;
        response.status(statusCode).json(errorResponse(error.message));
      } else {
        response.status(500).json(errorResponse(handleError(error)));
      }
    }
  }
);
