/**
 * Update Quote Function
 * Updates quote details (staff/admin only)
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateQuoteStatus } from '../utils/validation';

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface UpdateQuoteRequest {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime?: string;
  endTime?: string;
  headcount?: number;
  lineItems?: QuoteLineItem[];
  tax?: number;
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  validUntil?: string;
  notes?: string;
  reservationId?: string;
}

export const updateQuote = onRequest(
  { cors: true, region: 'asia-northeast3' },
  async (request, response) => {
    try {
      // Only accept PUT/PATCH requests
      if (request.method !== 'PUT' && request.method !== 'PATCH') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      // Verify authentication and require staff/admin role
      const user = await verifyToken(request);
      requireStaff(user);

      const data = request.body as UpdateQuoteRequest;

      // Validate quote ID
      if (!data.id) {
        response.status(400).json(errorResponse('Quote ID is required'));
        return;
      }

      // Fetch existing quote
      const quoteRef = admin.firestore().collection('quotes').doc(data.id);
      const quoteDoc = await quoteRef.get();

      if (!quoteDoc.exists) {
        response.status(404).json(errorResponse('Quote not found'));
        return;
      }

      // Build update object
      const updates: any = {
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Update customer information
      if (data.customerName !== undefined) {
        updates.customerName = data.customerName;
      }
      if (data.customerEmail !== undefined) {
        updates.customerEmail = data.customerEmail || null;
      }
      if (data.customerPhone !== undefined) {
        updates.customerPhone = data.customerPhone || null;
      }

      // Update timestamps
      if (data.startTime) {
        const startTime = new Date(data.startTime);
        if (isNaN(startTime.getTime())) {
          response.status(400).json(errorResponse('Invalid startTime format'));
          return;
        }
        updates.startTime = admin.firestore.Timestamp.fromDate(startTime);
      }

      if (data.endTime) {
        const endTime = new Date(data.endTime);
        if (isNaN(endTime.getTime())) {
          response.status(400).json(errorResponse('Invalid endTime format'));
          return;
        }
        updates.endTime = admin.firestore.Timestamp.fromDate(endTime);
      }

      // Validate endTime is after startTime if both are being updated
      if (updates.startTime && updates.endTime) {
        if (updates.endTime.toDate() <= updates.startTime.toDate()) {
          response.status(400).json(errorResponse('endTime must be after startTime'));
          return;
        }
      }

      // Update headcount
      if (data.headcount !== undefined) {
        if (typeof data.headcount !== 'number' || data.headcount < 1) {
          response.status(400).json(errorResponse('Invalid headcount'));
          return;
        }
        updates.headcount = data.headcount;
      }

      // Update line items and recalculate amounts
      if (data.lineItems) {
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

        // Calculate line item amounts
        const processedLineItems = data.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        }));

        updates.lineItems = processedLineItems;

        // Recalculate subtotal
        const subtotal = processedLineItems.reduce((sum, item) => sum + item.amount, 0);
        updates.subtotal = subtotal;

        // Recalculate total amount
        const tax = data.tax !== undefined ? data.tax : (quoteDoc.data()?.tax || 0);
        updates.tax = tax;
        updates.totalAmount = subtotal + tax;
      } else if (data.tax !== undefined) {
        // If only tax is updated, recalculate totalAmount
        const currentData = quoteDoc.data();
        updates.tax = data.tax;
        updates.totalAmount = (currentData?.subtotal || 0) + data.tax;
      }

      // Update status
      if (data.status) {
        if (!validateQuoteStatus(data.status)) {
          response.status(400).json(errorResponse('Invalid status value'));
          return;
        }
        updates.status = data.status;
      }

      // Update validUntil
      if (data.validUntil) {
        const validUntil = new Date(data.validUntil);
        if (isNaN(validUntil.getTime())) {
          response.status(400).json(errorResponse('Invalid validUntil format'));
          return;
        }
        updates.validUntil = admin.firestore.Timestamp.fromDate(validUntil);
      }

      // Update notes
      if (data.notes !== undefined) {
        updates.notes = data.notes || null;
      }

      // Update reservationId
      if (data.reservationId !== undefined) {
        updates.reservationId = data.reservationId || null;
      }

      // Apply updates
      await quoteRef.update(updates);

      // Fetch updated quote
      const updatedDoc = await quoteRef.get();
      const updatedQuote = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };

      response.status(200).json(successResponse(
        updatedQuote,
        'Quote updated successfully'
      ));

    } catch (error) {
      console.error('Update quote error:', error);
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
