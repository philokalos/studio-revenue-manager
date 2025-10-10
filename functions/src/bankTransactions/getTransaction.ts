/**
 * Get Single Bank Transaction by ID
 * GET /getTransaction/:transactionId
 * Auth: Staff or Admin
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const getTransaction = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // Verify authentication
      const user = await verifyToken(req);
      requireStaff(user);

      // Only accept GET requests
      if (req.method !== 'GET') {
        res.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Extract transaction ID from query parameter or path
      const transactionId = req.query.transactionId as string || req.query.id as string;

      if (!transactionId) {
        res.status(400).json(errorResponse('Transaction ID is required'));
        return;
      }

      const db = admin.firestore();
      const transactionDoc = await db
        .collection('bankTransactions')
        .doc(transactionId)
        .get();

      if (!transactionDoc.exists) {
        res.status(404).json(errorResponse('Transaction not found'));
        return;
      }

      const data = transactionDoc.data()!;
      const transaction = {
        id: transactionDoc.id,
        transactionDate: data.transactionDate.toDate().toISOString(),
        amount: data.amount,
        depositorName: data.depositorName || null,
        memo: data.memo || null,
        transactionType: data.transactionType,
        matchedInvoiceId: data.matchedInvoiceId || null,
        status: data.status,
        rawData: data.rawData,
        uploadedBy: data.uploadedBy,
        uploadedAt: data.uploadedAt.toDate().toISOString(),
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString(),
      };

      res.status(200).json(successResponse(transaction));
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json(errorResponse(handleError(error)));
    }
  }
);
