/**
 * Delete Bank Transaction
 * DELETE /deleteTransaction/:transactionId
 * Auth: Admin only
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { verifyToken, requireAdmin } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const deleteTransaction = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // Verify authentication
      const user = await verifyToken(req);
      requireAdmin(user); // Admin only

      // Only accept DELETE requests
      if (req.method !== 'DELETE') {
        res.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Extract transaction ID from query parameter
      const transactionId = req.query.transactionId as string || req.query.id as string;

      if (!transactionId) {
        res.status(400).json(errorResponse('Transaction ID is required'));
        return;
      }

      const db = admin.firestore();
      const transactionRef = db.collection('bankTransactions').doc(transactionId);
      const transactionDoc = await transactionRef.get();

      if (!transactionDoc.exists) {
        res.status(404).json(errorResponse('Transaction not found'));
        return;
      }

      // Optional: Check if transaction is matched and prevent deletion
      const transactionData = transactionDoc.data()!;
      if (transactionData.status === 'MATCHED' && transactionData.matchedInvoiceId) {
        res.status(400).json(
          errorResponse(
            'Cannot delete matched transaction. Please unmatch it first.'
          )
        );
        return;
      }

      // Delete transaction
      await transactionRef.delete();

      res.status(200).json(
        successResponse(
          { transactionId },
          'Transaction deleted successfully'
        )
      );
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json(errorResponse(handleError(error)));
    }
  }
);
