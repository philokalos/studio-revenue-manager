/**
 * Delete Invoice Function (Void Invoice)
 * Voids an invoice (sets status to VOID)
 * Access: Admin only
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import { verifyToken, requireAdmin } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const deleteInvoice = https.onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (request, response) => {
    try {
      // Authentication
      const user = await verifyToken(request);
      requireAdmin(user);

      // Only allow DELETE
      if (request.method !== 'DELETE') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Extract invoice ID from query or body
      const id = request.query.id as string || request.body.id;

      if (!id) {
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

      const currentData = invoiceDoc.data()!;

      // Check if already voided
      if (currentData.status === 'VOID') {
        response.status(400).json(errorResponse('Invoice is already voided'));
        return;
      }

      // Void the invoice (set status to VOID instead of deleting)
      await invoiceRef.update({
        status: 'VOID',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      response.status(200).json(
        successResponse(
          {
            id,
            status: 'VOID',
          },
          'Invoice voided successfully'
        )
      );
    } catch (error) {
      console.error('Error voiding invoice:', error);

      if (error instanceof https.HttpsError) {
        const statusCode = error.code === 'unauthenticated' ? 401 :
                          error.code === 'permission-denied' ? 403 : 400;
        response.status(statusCode).json(errorResponse(error.message));
      } else {
        response.status(500).json(errorResponse(handleError(error)));
      }
    }
  }
);
