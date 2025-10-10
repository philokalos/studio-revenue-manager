/**
 * Scheduled Function: Calculate Monthly Summary
 * Runs monthly to calculate revenue, costs, and performance metrics
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

interface MonthlySummaryData {
  month: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  utilizationRate: number;
  goalAchievementRate: number;
  reservationCount: number;
  averageReservationValue: number;
  channelBreakdown: {
    [key: string]: number;
  };
}

export const calculateMonthlySummary = onSchedule(
  {
    schedule: '0 0 1 * *', // Run at midnight on the 1st of every month
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
  },
  async (event) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Calculating monthly summary for ${monthKey}`);

    const db = admin.firestore();

    try {
      // Get date range for last month
      const startOfMonth = admin.firestore.Timestamp.fromDate(
        new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
      );
      const endOfMonth = admin.firestore.Timestamp.fromDate(
        new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59)
      );

      // Calculate revenue from paid invoices
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

      // Get costs for the month
      const costsDoc = await db.collection('costs').doc(monthKey).get();
      const costsData = costsDoc.data();
      const totalCosts = costsData
        ? (costsData.rent || 0) +
          (costsData.utilities || 0) +
          (costsData.adsTotal || 0) +
          (costsData.supplies || 0) +
          (costsData.maintenance || 0)
        : 0;

      // Get goal for the month
      const goalDoc = await db.collection('goals').doc(monthKey).get();
      const goalData = goalDoc.data();
      const revenueTarget = goalData?.revenueTarget || 0;

      // Calculate metrics
      const netProfit = totalRevenue - totalCosts;
      const goalAchievementRate = revenueTarget > 0 ? totalRevenue / revenueTarget : 0;

      // Get reservation count
      const reservationsSnapshot = await db.collection('reservations')
        .where('startTime', '>=', startOfMonth)
        .where('startTime', '<=', endOfMonth)
        .where('status', '==', 'CONFIRMED')
        .get();

      const reservationCount = reservationsSnapshot.size;
      const averageReservationValue = reservationCount > 0 ? totalRevenue / reservationCount : 0;

      // Calculate utilization rate (assuming 12 hours/day * 30 days = 360 available hours)
      const totalAvailableHours = 360;
      let totalBookedHours = 0;

      reservationsSnapshot.forEach((doc) => {
        const reservation = doc.data();
        const startTime = reservation.startTime.toDate();
        const endTime = reservation.endTime.toDate();
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalBookedHours += hours;
      });

      const utilizationRate = totalBookedHours / totalAvailableHours;

      // Create monthly summary document
      const summaryData: MonthlySummaryData = {
        month: monthKey,
        totalRevenue,
        totalCosts,
        netProfit,
        utilizationRate,
        goalAchievementRate,
        reservationCount,
        averageReservationValue,
        channelBreakdown: revenueByChannel,
      };

      await db.collection('monthlySummaries').doc(monthKey).set({
        ...summaryData,
        lastCalculatedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Update goal with actual revenue
      if (goalDoc.exists) {
        await db.collection('goals').doc(monthKey).update({
          actualRevenue: totalRevenue,
          achievementRate: goalAchievementRate,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      console.log(`✅ Monthly summary calculated for ${monthKey}`, summaryData);

    } catch (error) {
      console.error(`❌ Failed to calculate monthly summary for ${monthKey}:`, error);
      throw error;
    }
  }
);
