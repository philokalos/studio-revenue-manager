/**
 * Firestore Trigger: Recalculate Monthly Summary
 * Triggers when an invoice is updated (payment recorded)
 */
import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const recalculateMonthlySummary = onDocumentUpdated(
  {
    document: 'invoices/{invoiceId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      return;
    }

    // Check if payment status changed
    const paymentChanged =
      before.paidAmount !== after.paidAmount ||
      before.status !== after.status;

    if (!paymentChanged) {
      return;
    }

    const db = admin.firestore();

    try {
      // Get the payment date to determine which month to update
      const paymentDate = after.paymentDate?.toDate() || new Date();
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

      console.log(`Recalculating monthly summary for ${monthKey} due to invoice update`);

      // Get start and end of month
      const startOfMonth = admin.firestore.Timestamp.fromDate(
        new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1)
      );
      const endOfMonth = admin.firestore.Timestamp.fromDate(
        new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0, 23, 59, 59)
      );

      // Calculate total revenue from all paid invoices in the month
      const invoicesSnapshot = await db.collection('invoices')
        .where('paymentDate', '>=', startOfMonth)
        .where('paymentDate', '<=', endOfMonth)
        .where('status', 'in', ['PAID', 'PARTIAL'])
        .get();

      let totalRevenue = 0;
      const revenueByChannel: { [key: string]: number } = {
        default: 0,
        hourplace: 0,
        spacecloud: 0,
      };

      for (const invoiceDoc of invoicesSnapshot.docs) {
        const invoice = invoiceDoc.data();
        totalRevenue += invoice.paidAmount || 0;

        // Get channel from reservation
        const reservationDoc = await db.collection('reservations')
          .doc(invoice.reservationId)
          .get();

        if (reservationDoc.exists) {
          const reservation = reservationDoc.data();
          const channel = reservation?.channel || 'default';
          revenueByChannel[channel] += invoice.paidAmount || 0;
        }
      }

      // Get existing summary or create new one
      const summaryRef = db.collection('monthlySummaries').doc(monthKey);
      const summaryDoc = await summaryRef.get();

      if (summaryDoc.exists) {
        // Update existing summary
        const summaryData = summaryDoc.data();
        const totalCosts = summaryData?.totalCosts || 0;
        const netProfit = totalRevenue - totalCosts;

        // Get goal for achievement rate calculation
        const goalDoc = await db.collection('goals').doc(monthKey).get();
        const goalData = goalDoc.data();
        const revenueTarget = goalData?.revenueTarget || 0;
        const goalAchievementRate = revenueTarget > 0 ? totalRevenue / revenueTarget : 0;

        await summaryRef.update({
          totalRevenue,
          netProfit,
          goalAchievementRate,
          channelBreakdown: revenueByChannel,
          lastCalculatedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Update goal actual revenue
        if (goalDoc.exists) {
          await db.collection('goals').doc(monthKey).update({
            actualRevenue: totalRevenue,
            achievementRate: goalAchievementRate,
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }

        console.log(`✅ Updated monthly summary for ${monthKey}: revenue ${totalRevenue}`);
      } else {
        console.log(`Monthly summary for ${monthKey} does not exist yet, skipping update`);
      }

    } catch (error) {
      console.error('❌ Failed to recalculate monthly summary:', error);
      // Don't throw error to avoid invoice update failure
    }
  }
);
