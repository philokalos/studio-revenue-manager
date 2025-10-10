/**
 * Get Bank Transactions with Filtering
 * GET /getTransactions
 * Auth: Staff or Admin
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

interface QueryParams {
  status?: 'UNMATCHED' | 'MATCHED' | 'PENDING_REVIEW';
  transactionType?: 'DEPOSIT' | 'WITHDRAWAL';
  startDate?: string;
  endDate?: string;
  limit?: string;
}

export const getTransactions = onRequest(
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

      const {
        status,
        transactionType,
        startDate,
        endDate,
        limit: limitParam,
      } = req.query as QueryParams;

      // Parse and validate limit
      let limit = 50; // Default limit
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          res.status(400).json(errorResponse('Invalid limit parameter'));
          return;
        }
        limit = Math.min(parsedLimit, 100); // Max limit: 100
      }

      // Validate status if provided
      if (status && !['UNMATCHED', 'MATCHED', 'PENDING_REVIEW'].includes(status)) {
        res.status(400).json(errorResponse('Invalid status parameter'));
        return;
      }

      // Validate transaction type if provided
      if (transactionType && !['DEPOSIT', 'WITHDRAWAL'].includes(transactionType)) {
        res.status(400).json(errorResponse('Invalid transactionType parameter'));
        return;
      }

      const db = admin.firestore();
      let query: admin.firestore.Query = db.collection('bankTransactions');

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }

      if (transactionType) {
        query = query.where('transactionType', '==', transactionType);
      }

      // Date range filtering
      if (startDate) {
        try {
          const startDateObj = new Date(startDate);
          if (isNaN(startDateObj.getTime())) {
            throw new Error('Invalid start date');
          }
          const startTimestamp = admin.firestore.Timestamp.fromDate(startDateObj);
          query = query.where('transactionDate', '>=', startTimestamp);
        } catch (error) {
          res.status(400).json(errorResponse('Invalid startDate format'));
          return;
        }
      }

      if (endDate) {
        try {
          const endDateObj = new Date(endDate);
          if (isNaN(endDateObj.getTime())) {
            throw new Error('Invalid end date');
          }
          const endTimestamp = admin.firestore.Timestamp.fromDate(endDateObj);
          query = query.where('transactionDate', '<=', endTimestamp);
        } catch (error) {
          res.status(400).json(errorResponse('Invalid endDate format'));
          return;
        }
      }

      // Order by transactionDate descending and apply limit
      query = query.orderBy('transactionDate', 'desc').limit(limit);

      // Execute query
      const snapshot = await query.get();

      const transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          transactionDate: data.transactionDate.toDate().toISOString(),
          amount: data.amount,
          depositorName: data.depositorName || null,
          memo: data.memo || null,
          transactionType: data.transactionType,
          matchedInvoiceId: data.matchedInvoiceId || null,
          status: data.status,
          uploadedBy: data.uploadedBy,
          uploadedAt: data.uploadedAt.toDate().toISOString(),
          createdAt: data.createdAt.toDate().toISOString(),
          updatedAt: data.updatedAt.toDate().toISOString(),
        };
      });

      res.status(200).json(
        successResponse({
          transactions,
          count: transactions.length,
          limit,
        })
      );
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json(errorResponse(handleError(error)));
    }
  }
);
