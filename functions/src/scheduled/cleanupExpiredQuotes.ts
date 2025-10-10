/**
 * Scheduled Function: Cleanup Expired Quotes
 * Runs daily to mark quotes as EXPIRED if validUntil date has passed
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const cleanupExpiredQuotes = onSchedule(
  {
    schedule: '0 0 * * *', // Run daily at midnight
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
  },
  async (event) => {
    console.log('Starting cleanup of expired quotes');

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Find quotes that are not EXPIRED but validUntil has passed
      const expiredQuotesSnapshot = await db.collection('quotes')
        .where('status', 'in', ['DRAFT', 'SENT'])
        .where('validUntil', '<', now)
        .get();

      if (expiredQuotesSnapshot.empty) {
        console.log('No expired quotes found');
        return;
      }

      console.log(`Found ${expiredQuotesSnapshot.size} expired quotes`);

      // Batch update expired quotes
      const batch = db.batch();
      let expiredCount = 0;

      expiredQuotesSnapshot.forEach((doc) => {
        const quoteRef = db.collection('quotes').doc(doc.id);
        batch.update(quoteRef, {
          status: 'EXPIRED',
          updatedAt: admin.firestore.Timestamp.now(),
        });
        expiredCount++;
      });

      await batch.commit();

      console.log(`✅ Successfully marked ${expiredCount} quotes as EXPIRED`);

    } catch (error) {
      console.error('❌ Failed to cleanup expired quotes:', error);
      throw error;
    }
  }
);
