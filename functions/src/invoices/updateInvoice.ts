/**
 * Update Invoice Function
 * Update invoice details including payment recording
 * Access: Staff/Admin only
 */
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import { verifyToken, requireStaff } from '../utils/auth';
import { successResponse, errorResponse, handleError } from '../utils/response';

export const updateInvoice = https.onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (request, response) => {
    try {
      // Authentication
      const user = await verifyToken(request);
      requireStaff(user);

      // Only allow PUT/PATCH
      if (!['PUT', 'PATCH'].includes(request.method)) {
        response.status(405).json(errorResponse('Method not allowed'));
        return;
      }

      const { id, ...updates } = request.body;

      if (!id) {
        response.status(400).json(errorResponse('Invoice ID is required'));
        return;
      }

      // Fetch current invoice
      const invoiceRef = admin.firestore()
        .collection('invoices')
        .doc(id);

      const invoiceDoc = await invoiceRef.get();

      if (!invoiceDoc.exists) {
        response.status(404).json(errorResponse('Invoice not found'));
        return;
      }

      const currentData = invoiceDoc.data()!;

      // Cannot update VOID invoices
      if (currentData.status === 'VOID') {
        response.status(400).json(errorResponse('Cannot update voided invoice'));
        return;
      }

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Handle expectedAmount update
      if (updates.expectedAmount !== undefined) {
        if (updates.expectedAmount <= 0) {
          response.status(400).json(errorResponse('Expected amount must be positive'));
          return;
        }
        updateData.expectedAmount = updates.expectedAmount;

        // Recalculate final amount if expectedAmount changes
        const newDiscountAmount = currentData.discountAmount || 0;
        updateData.finalAmount = updates.expectedAmount - newDiscountAmount;

        if (updateData.finalAmount < 0) {
          response.status(400).json(errorResponse('Final amount cannot be negative'));
          return;
        }
      }

      // Handle discount update
      if (updates.discountType !== undefined || updates.discountValue !== undefined) {
        const discountType = updates.discountType || currentData.discountType;
        const discountValue = updates.discountValue !== undefined ?
          updates.discountValue : currentData.discountValue;

        if (discountType && discountValue !== undefined) {
          if (!['amount', 'rate'].includes(discountType)) {
            response.status(400).json(errorResponse('Invalid discount type'));
            return;
          }

          if (discountValue < 0) {
            response.status(400).json(errorResponse('Discount value must be non-negative'));
            return;
          }

          let discountAmount = 0;
          const expectedAmount = updateData.expectedAmount || currentData.expectedAmount;

          if (discountType === 'amount') {
            discountAmount = discountValue;
          } else if (discountType === 'rate') {
            if (discountValue > 100) {
              response.status(400).json(errorResponse('Discount rate cannot exceed 100%'));
              return;
            }
            discountAmount = Math.round(expectedAmount * (discountValue / 100));
          }

          updateData.discountType = discountType;
          updateData.discountValue = discountValue;
          updateData.discountAmount = discountAmount;
          updateData.finalAmount = expectedAmount - discountAmount;

          if (updateData.finalAmount < 0) {
            response.status(400).json(errorResponse('Final amount cannot be negative'));
            return;
          }

          // Add to discount logs
          const discountLogs = currentData.discountLogs || [];
          discountLogs.push({
            appliedBy: user.uid,
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
            discountType,
            discountValue,
          });
          updateData.discountLogs = discountLogs;
        }
      }

      // Handle payment recording
      if (updates.paidAmount !== undefined || updates.paymentMethod !== undefined) {
        const paidAmount = updates.paidAmount !== undefined ?
          updates.paidAmount : currentData.paidAmount || 0;

        if (paidAmount < 0) {
          response.status(400).json(errorResponse('Paid amount cannot be negative'));
          return;
        }

        const finalAmount = updateData.finalAmount || currentData.finalAmount;

        updateData.paidAmount = paidAmount;

        // Update payment date if payment is being recorded
        if (paidAmount > 0 && updates.paidAmount !== undefined) {
          updateData.paymentDate = admin.firestore.FieldValue.serverTimestamp();
        }

        // Set payment method if provided
        if (updates.paymentMethod) {
          updateData.paymentMethod = updates.paymentMethod;
        }

        // Auto-update status based on payment
        if (paidAmount >= finalAmount) {
          updateData.status = 'PAID';
        } else if (paidAmount > 0 && paidAmount < finalAmount) {
          updateData.status = 'PARTIAL';
        } else {
          updateData.status = 'OPEN';
        }
      }

      // Handle dueDate update
      if (updates.dueDate !== undefined) {
        if (updates.dueDate === null) {
          updateData.dueDate = admin.firestore.FieldValue.delete();
        } else {
          try {
            updateData.dueDate = admin.firestore.Timestamp.fromDate(new Date(updates.dueDate));
          } catch (error) {
            response.status(400).json(errorResponse('Invalid dueDate format'));
            return;
          }
        }
      }

      // Update invoice
      await invoiceRef.update(updateData);

      // Fetch updated invoice
      const updatedInvoice = await invoiceRef.get();

      response.status(200).json(
        successResponse(
          {
            id: invoiceRef.id,
            ...updatedInvoice.data(),
          },
          'Invoice updated successfully'
        )
      );
    } catch (error) {
      console.error('Error updating invoice:', error);

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
