/**
 * Manually Match Bank Transaction to Invoice
 * POST /matchTransaction
 * Auth: Staff or Admin
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired } from '../utils/validation';

interface MatchRequest {
  transactionId: string;
  invoiceId: string;
}

export const matchTransaction = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // Verify authentication
      const user = await verifyToken(req);
      requireStaff(user);

      // Only accept POST requests
      if (req.method !== 'POST') {
        res.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      const { transactionId, invoiceId } = req.body as MatchRequest;

      // Validate request
      validateRequired(req.body, ['transactionId', 'invoiceId']);

      const db = admin.firestore();

      // Verify transaction exists
      const transactionRef = db.collection('bankTransactions').doc(transactionId);
      const transactionDoc = await transactionRef.get();

      if (!transactionDoc.exists) {
        res.status(404).json(errorResponse('Transaction not found'));
        return;
      }

      // Verify invoice exists
      const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();

      if (!invoiceDoc.exists) {
        res.status(404).json(errorResponse('Invoice not found'));
        return;
      }

      const transactionData = transactionDoc.data()!;

      // Check if transaction is already matched
      if (transactionData.status === 'MATCHED' && transactionData.matchedInvoiceId) {
        res.status(400).json(
          errorResponse(
            `Transaction is already matched to invoice: ${transactionData.matchedInvoiceId}`
          )
        );
        return;
      }

      // Update transaction with match information
      const now = admin.firestore.Timestamp.now();
      await transactionRef.update({
        matchedInvoiceId: invoiceId,
        status: 'MATCHED',
        updatedAt: now,
      });

      // Retrieve updated transaction
      const updatedDoc = await transactionRef.get();
      const updatedData = updatedDoc.data()!;

      const transaction = {
        id: updatedDoc.id,
        transactionDate: updatedData.transactionDate.toDate().toISOString(),
        amount: updatedData.amount,
        depositorName: updatedData.depositorName || null,
        memo: updatedData.memo || null,
        transactionType: updatedData.transactionType,
        matchedInvoiceId: updatedData.matchedInvoiceId,
        status: updatedData.status,
        uploadedBy: updatedData.uploadedBy,
        uploadedAt: updatedData.uploadedAt.toDate().toISOString(),
        createdAt: updatedData.createdAt.toDate().toISOString(),
        updatedAt: updatedData.updatedAt.toDate().toISOString(),
      };

      res.status(200).json(
        successResponse(transaction, 'Transaction matched successfully')
      );
    } catch (error) {
      console.error('Match transaction error:', error);
      res.status(500).json(errorResponse(handleError(error)));
    }
  }
);
