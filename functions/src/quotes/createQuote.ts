/**
 * Create Quote Function
 * Creates a new price quote (staff/admin only)
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired } from '../utils/validation';

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface CreateQuoteRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  headcount: number;
  lineItems: QuoteLineItem[];
  tax?: number;
  validUntil?: string; // ISO timestamp
  notes?: string;
  reservationId?: string;
}

export const createQuote = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and require staff/admin role
      const user = await verifyToken(request);
      requireStaff(user);

      const data = request.body as CreateQuoteRequest;

      // Validate required fields
      validateRequired(data, [
        'customerName',
        'startTime',
        'endTime',
        'headcount',
        'lineItems',
      ]);

      // Validate lineItems array
      if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
        response.status(400).json(errorResponse('lineItems must be a non-empty array'));
        return;
      }

      // Validate each line item
      for (const item of data.lineItems) {
        if (!item.description || typeof item.quantity !== 'number' ||
            typeof item.unitPrice !== 'number') {
          response.status(400).json(errorResponse('Invalid line item format'));
          return;
        }
      }

      // Validate timestamps
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        response.status(400).json(errorResponse('Invalid timestamp format'));
        return;
      }

      if (endTime <= startTime) {
        response.status(400).json(errorResponse('endTime must be after startTime'));
        return;
      }

      // Calculate line item amounts
      const processedLineItems = data.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      }));

      // Calculate subtotal
      const subtotal = processedLineItems.reduce((sum, item) => sum + item.amount, 0);

      // Calculate total amount
      const tax = data.tax || 0;
      const totalAmount = subtotal + tax;

      // Set validUntil (default: 7 days from now)
      let validUntil: admin.firestore.Timestamp;
      if (data.validUntil) {
        const validUntilDate = new Date(data.validUntil);
        if (isNaN(validUntilDate.getTime())) {
          response.status(400).json(errorResponse('Invalid validUntil format'));
          return;
        }
        validUntil = admin.firestore.Timestamp.fromDate(validUntilDate);
      } else {
        const defaultValidUntil = new Date();
        defaultValidUntil.setDate(defaultValidUntil.getDate() + 7);
        validUntil = admin.firestore.Timestamp.fromDate(defaultValidUntil);
      }

      // Create quote document
      const quoteRef = admin.firestore().collection('quotes').doc();
      const now = admin.firestore.Timestamp.now();

      const quoteData = {
        id: quoteRef.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        startTime: admin.firestore.Timestamp.fromDate(startTime),
        endTime: admin.firestore.Timestamp.fromDate(endTime),
        headcount: data.headcount,
        lineItems: processedLineItems,
        subtotal,
        tax,
        totalAmount,
        validUntil,
        status: 'DRAFT' as const,
        notes: data.notes || null,
        reservationId: data.reservationId || null,
        createdAt: now,
        updatedAt: now,
      };

      await quoteRef.set(quoteData);

      response.status(201).json(successResponse(
        quoteData,
        'Quote created successfully'
      ));

    } catch (error) {
      console.error('Create quote error:', error);
      const errorMessage = handleError(error);

      if (errorMessage.includes('unauthenticated')) {
        response.status(401).json(errorResponse(errorMessage));
      } else if (errorMessage.includes('permission-denied')) {
        response.status(403).json(errorResponse(errorMessage));
      } else {
        response.status(500).json(errorResponse(errorMessage));
      }
    }
  }
);
