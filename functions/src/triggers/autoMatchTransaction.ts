/**
 * Firestore Trigger: Auto-match Bank Transaction
 * Triggers when a bank transaction is created and attempts to find matching invoice
 */
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

/**
 * Simple string similarity check (Levenshtein distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = getEditDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export const autoMatchTransaction = onDocumentCreated(
  {
    document: 'bankTransactions/{transactionId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const transaction = event.data?.data();
    const transactionId = event.params.transactionId;

    if (!transaction || transaction.transactionType !== 'DEPOSIT') {
      console.log(`Skipping auto-match for transaction ${transactionId}: not a deposit`);
      return;
    }

    const db = admin.firestore();

    try {
      // Search for open invoices with similar amount (within 5% tolerance)
      const amount = transaction.amount;
      const minAmount = amount * 0.95;
      const maxAmount = amount * 1.05;

      const openInvoicesSnapshot = await db.collection('invoices')
        .where('status', 'in', ['OPEN', 'PARTIAL'])
        .where('finalAmount', '>=', minAmount)
        .where('finalAmount', '<=', maxAmount)
        .get();

      if (openInvoicesSnapshot.empty) {
        console.log(`No matching invoices found for transaction ${transactionId}`);
        return;
      }

      let bestMatch: { invoiceId: string; confidence: number; invoice: any } | null = null;

      // Find best match based on amount and depositor name
      for (const invoiceDoc of openInvoicesSnapshot.docs) {
        const invoice = invoiceDoc.data();
        let confidence = 0;

        // Amount match (up to 50% confidence)
        const amountDiff = Math.abs(amount - invoice.finalAmount);
        const amountMatchScore = Math.max(0, 1 - (amountDiff / invoice.finalAmount));
        confidence += amountMatchScore * 50;

        // Name match (up to 50% confidence)
        if (transaction.depositorName && invoice.reservationId) {
          const reservationDoc = await db.collection('reservations')
            .doc(invoice.reservationId)
            .get();

          if (reservationDoc.exists) {
            const reservation = reservationDoc.data();
            if (reservation?.payerName) {
              const nameSimilarity = calculateSimilarity(
                transaction.depositorName,
                reservation.payerName
              );
              confidence += nameSimilarity * 50;
            }
          }
        }

        // Keep best match
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            invoiceId: invoiceDoc.id,
            confidence,
            invoice,
          };
        }
      }

      // Only auto-match if confidence is high enough (>80%)
      if (bestMatch && bestMatch.confidence > 80) {
        // Create transaction match record
        const matchRef = db.collection('transactionMatches').doc();
        await matchRef.set({
          id: matchRef.id,
          transactionId: transactionId,
          invoiceId: bestMatch.invoiceId,
          matchConfidence: bestMatch.confidence,
          matchReason: `Auto-matched: Amount similarity + Name similarity`,
          matchType: 'AUTO',
          verified: false,
          transactionAmount: amount,
          invoiceAmount: bestMatch.invoice.finalAmount,
          amountDifference: Math.abs(amount - bestMatch.invoice.finalAmount),
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Update transaction status
        await db.collection('bankTransactions').doc(transactionId).update({
          status: 'PENDING_REVIEW',
          matchedInvoiceId: bestMatch.invoiceId,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(
          `✅ Auto-matched transaction ${transactionId} to invoice ${bestMatch.invoiceId} ` +
          `with ${bestMatch.confidence.toFixed(1)}% confidence`
        );
      } else {
        console.log(
          `No high-confidence match found for transaction ${transactionId} ` +
          `(best: ${bestMatch?.confidence.toFixed(1)}%)`
        );
      }

    } catch (error) {
      console.error(`❌ Failed to auto-match transaction ${transactionId}:`, error);
      // Don't throw error to avoid transaction creation failure
    }
  }
);
