/**
 * Firestore Trigger: Auto-generate Invoice
 * Triggers when a reservation is created or confirmed
 */
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

const HOURLY_RATES: { [key: string]: number } = {
  default: 50000,
  hourplace: 45000,
  spacecloud: 45000,
};

/**
 * Calculate expected amount based on reservation details
 */
function calculateExpectedAmount(reservation: any): number {
  const startTime = reservation.startTime.toDate();
  const endTime = reservation.endTime.toDate();
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const channel = reservation.channel || 'default';
  const hourlyRate = HOURLY_RATES[channel] || HOURLY_RATES.default;

  return Math.round(hours * hourlyRate);
}

/**
 * Create invoice when reservation is created
 */
export const autoGenerateInvoiceOnCreate = onDocumentCreated(
  {
    document: 'reservations/{reservationId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const reservation = event.data?.data();
    const reservationId = event.params.reservationId;

    if (!reservation || reservation.status !== 'CONFIRMED') {
      console.log(`Skipping invoice generation for reservation ${reservationId}: not confirmed`);
      return;
    }

    const db = admin.firestore();

    try {
      // Check if invoice already exists
      const existingInvoices = await db.collection('invoices')
        .where('reservationId', '==', reservationId)
        .limit(1)
        .get();

      if (!existingInvoices.empty) {
        console.log(`Invoice already exists for reservation ${reservationId}`);
        return;
      }

      // Calculate expected amount
      const expectedAmount = calculateExpectedAmount(reservation);

      // Create invoice
      const invoiceRef = db.collection('invoices').doc();
      await invoiceRef.set({
        id: invoiceRef.id,
        reservationId: reservationId,
        expectedAmount: expectedAmount,
        discountAmount: 0,
        finalAmount: expectedAmount,
        status: 'OPEN',
        paidAmount: 0,
        discountLogs: [],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`✅ Auto-generated invoice ${invoiceRef.id} for reservation ${reservationId}`);

    } catch (error) {
      console.error(`❌ Failed to auto-generate invoice for reservation ${reservationId}:`, error);
      throw error;
    }
  }
);

/**
 * Update invoice when reservation is confirmed
 */
export const autoGenerateInvoiceOnUpdate = onDocumentUpdated(
  {
    document: 'reservations/{reservationId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const reservationId = event.params.reservationId;

    if (!before || !after) {
      return;
    }

    // Check if status changed to CONFIRMED
    if (before.status !== 'CONFIRMED' && after.status === 'CONFIRMED') {
      const db = admin.firestore();

      try {
        // Check if invoice already exists
        const existingInvoices = await db.collection('invoices')
          .where('reservationId', '==', reservationId)
          .limit(1)
          .get();

        if (!existingInvoices.empty) {
          console.log(`Invoice already exists for reservation ${reservationId}`);
          return;
        }

        // Calculate expected amount
        const expectedAmount = calculateExpectedAmount(after);

        // Create invoice
        const invoiceRef = db.collection('invoices').doc();
        await invoiceRef.set({
          id: invoiceRef.id,
          reservationId: reservationId,
          expectedAmount: expectedAmount,
          discountAmount: 0,
          finalAmount: expectedAmount,
          status: 'OPEN',
          paidAmount: 0,
          discountLogs: [],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`✅ Auto-generated invoice ${invoiceRef.id} for confirmed reservation ${reservationId}`);

      } catch (error) {
        console.error(`❌ Failed to auto-generate invoice for confirmed reservation ${reservationId}:`, error);
        throw error;
      }
    }
  }
);
