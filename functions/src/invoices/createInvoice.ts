/**
 * Create Invoice Function
 * Creates a new invoice for a reservation
 * Access: Staff/Admin only
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';
import { validateRequired } from '../utils/validation';

export const createInvoice = https.onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (request, response) => {
    try {
      // Authentication
      const user = await verifyToken(request);
      requireStaff(user);

      // Only allow POST
      if (request.method !== 'POST') {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      const data = request.body;

      // Validate required fields
      validateRequired(data, ['reservationId', 'expectedAmount']);

      const {
        reservationId,
        expectedAmount,
        discountType,
        discountValue,
        dueDate
      } = data;

      // Validate expectedAmount is positive
      if (expectedAmount <= 0) {
        response.status(400).json(errorResponse('Expected amount must be positive'));
        return;
      }

      // Verify reservation exists
      const reservationRef = admin.firestore()
        .collection('reservations')
        .doc(reservationId);
      const reservationDoc = await reservationRef.get();

      if (!reservationDoc.exists) {
        response.status(404).json(errorResponse('Reservation not found'));
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      const discountLogs: any[] = [];

      if (discountType && discountValue) {
        if (!['amount', 'rate'].includes(discountType)) {
          response.status(400).json(errorResponse('Invalid discount type. Must be "amount" or "rate"'));
          return;
        }

        if (discountValue < 0) {
          response.status(400).json(errorResponse('Discount value must be non-negative'));
          return;
        }

        if (discountType === 'amount') {
          discountAmount = discountValue;
        } else if (discountType === 'rate') {
          if (discountValue > 100) {
            response.status(400).json(errorResponse('Discount rate cannot exceed 100%'));
            return;
          }
          discountAmount = Math.round(expectedAmount * (discountValue / 100));
        }

        // Add to discount log
        discountLogs.push({
          appliedBy: user.uid,
          appliedAt: admin.firestore.FieldValue.serverTimestamp(),
          discountType,
          discountValue,
        });
      }

      // Calculate final amount
      const finalAmount = expectedAmount - discountAmount;

      if (finalAmount < 0) {
        response.status(400).json(errorResponse('Final amount cannot be negative'));
        return;
      }

      // Create invoice document
      const invoiceData: any = {
        reservationId,
        expectedAmount,
        discountAmount,
        finalAmount,
        status: 'OPEN',
        paidAmount: 0,
        discountLogs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add optional fields
      if (discountType) invoiceData.discountType = discountType;
      if (discountValue) invoiceData.discountValue = discountValue;
      if (dueDate) {
        invoiceData.dueDate = admin.firestore.Timestamp.fromDate(new Date(dueDate));
      }

      // Save to Firestore
      const invoiceRef = await admin.firestore()
        .collection('invoices')
        .add(invoiceData);

      // Fetch created invoice
      const createdInvoice = await invoiceRef.get();

      response.status(201).json(
        successResponse(
          {
            id: invoiceRef.id,
            ...createdInvoice.data()
          },
          'Invoice created successfully'
        )
      );
    } catch (error) {
      console.error('Error creating invoice:', error);

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
