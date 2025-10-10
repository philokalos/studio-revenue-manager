/**
 * Upload Bank Transactions from CSV
 * POST /uploadTransactions
 * Auth: Staff or Admin
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired } from '../utils/validation';

interface CSVRow {
  transactionDate: string;
  amount: string;
  depositorName?: string;
  memo?: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  [key: string]: any;
}

interface UploadRequest {
  csvData: CSVRow[];
}

export const uploadTransactions = onRequest(
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

      const { csvData } = req.body as UploadRequest;

      // Validate request
      if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        res.status(400).json(errorResponse('CSV data is required and must be a non-empty array'));
        return;
      }

      const db = admin.firestore();
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();
      const uploadedTransactions: string[] = [];

      // Process each CSV row
      for (const row of csvData) {
        try {
          // Validate required fields
          validateRequired(row, ['transactionDate', 'amount', 'transactionType']);

          // Validate transaction type
          if (!['DEPOSIT', 'WITHDRAWAL'].includes(row.transactionType)) {
            throw new Error(`Invalid transaction type: ${row.transactionType}`);
          }

          // Parse amount
          const amount = parseFloat(row.amount);
          if (isNaN(amount)) {
            throw new Error(`Invalid amount: ${row.amount}`);
          }

          // Validate amount sign based on transaction type
          if (row.transactionType === 'DEPOSIT' && amount <= 0) {
            throw new Error(`Deposit amount must be positive: ${amount}`);
          }
          if (row.transactionType === 'WITHDRAWAL' && amount >= 0) {
            throw new Error(`Withdrawal amount must be negative: ${amount}`);
          }

          // Parse transaction date
          let transactionDate: admin.firestore.Timestamp;
          try {
            const dateValue = new Date(row.transactionDate);
            if (isNaN(dateValue.getTime())) {
              throw new Error('Invalid date');
            }
            transactionDate = admin.firestore.Timestamp.fromDate(dateValue);
          } catch (error) {
            throw new Error(`Invalid transaction date: ${row.transactionDate}`);
          }

          // Create new transaction document
          const transactionRef = db.collection('bankTransactions').doc();
          const transactionData = {
            id: transactionRef.id,
            transactionDate,
            amount,
            depositorName: row.depositorName || null,
            memo: row.memo || null,
            transactionType: row.transactionType,
            matchedInvoiceId: null,
            status: 'UNMATCHED',
            rawData: { ...row },
            uploadedBy: user.uid,
            uploadedAt: now,
            createdAt: now,
            updatedAt: now,
          };

          batch.set(transactionRef, transactionData);
          uploadedTransactions.push(transactionRef.id);
        } catch (rowError) {
          // If any row fails validation, abort the entire batch
          res.status(400).json(
            errorResponse(
              `Error processing transaction row: ${handleError(rowError)}`
            )
          );
          return;
        }
      }

      // Commit batch
      await batch.commit();

      res.status(201).json(
        successResponse(
          {
            uploadedCount: uploadedTransactions.length,
            transactionIds: uploadedTransactions,
          },
          'Bank transactions uploaded successfully'
        )
      );
    } catch (error) {
      console.error('Upload transactions error:', error);
      res.status(500).json(errorResponse(handleError(error)));
    }
  }
);
