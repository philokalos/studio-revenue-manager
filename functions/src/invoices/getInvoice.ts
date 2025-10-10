/**
 * Get Invoice Function
 * Get single invoice by ID
 * Access: Authenticated users
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import { verifyToken } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const getInvoice = https.onRequest(
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

      // Extract invoice ID from query or path
      const { id } = request.query;

      if (!id || typeof id !== 'string') {
        response.status(400).json(errorResponse('Invoice ID is required'));
        return;
      }

      // Fetch invoice
      const invoiceRef = admin.firestore()
        .collection('invoices')
        .doc(id);

      const invoiceDoc = await invoiceRef.get();

      if (!invoiceDoc.exists) {
        response.status(404).json(errorResponse('Invoice not found'));
        return;
      }

      // Return invoice data
      response.status(200).json(
        successResponse({
          id: invoiceDoc.id,
          ...invoiceDoc.data(),
        })
      );
    } catch (error) {
      console.error('Error fetching invoice:', error);

      if (error instanceof https.HttpsError) {
        const statusCode = error.code === 'unauthenticated' ? 401 : 400;
        response.status(statusCode).json(errorResponse(error.message));
      } else {
        response.status(500).json(errorResponse(handleError(error)));
      }
    }
  }
);
