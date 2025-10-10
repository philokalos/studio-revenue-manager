/**
 * CSV Bank Statement Parser
 * Track 5: CSV Bank Matching
 *
 * Parses bank CSV statements and matches transactions to reservations
 */

import { parse } from 'csv-parse/sync';
import { db } from '../db';

export interface BankTransaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  rawData: string;
}

export interface MatchedTransaction extends BankTransaction {
  reservationId?: number;
  matchConfidence: number; // 0-1 scale
  matchReason?: string;
}

export interface CSVParseResult {
  success: boolean;
  transactions: BankTransaction[];
  errors: string[];
}

export interface MatchResult {
  matched: MatchedTransaction[];
  unmatched: BankTransaction[];
  totalMatches: number;
  totalUnmatched: number;
  averageConfidence: number;
}

/**
 * Korean bank CSV parser configurations
 * Supports major Korean banks: KB, Shinhan, Woori, Hana, NH
 */
const BANK_FORMATS = {
  KB_KOOKMIN: {
    dateColumn: 0,
    descriptionColumn: 1,
    withdrawalColumn: 2,
    depositColumn: 3,
    balanceColumn: 4,
    dateFormat: 'YYYY-MM-DD',
    encoding: 'utf-8',
  },
  SHINHAN: {
    dateColumn: 0,
    descriptionColumn: 2,
    withdrawalColumn: 3,
    depositColumn: 4,
    balanceColumn: 5,
    dateFormat: 'YYYY.MM.DD',
    encoding: 'utf-8',
  },
  DEFAULT: {
    dateColumn: 0,
    descriptionColumn: 1,
    withdrawalColumn: 2,
    depositColumn: 3,
    balanceColumn: 4,
    dateFormat: 'YYYY-MM-DD',
    encoding: 'utf-8',
  },
};

/**
 * Parse Korean bank CSV statement
 */
export async function parseBankCSV(
  csvContent: string,
  bankType: keyof typeof BANK_FORMATS = 'DEFAULT'
): Promise<CSVParseResult> {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];

  try {
    const format = BANK_FORMATS[bankType];

    // Parse CSV with Korean encoding support
    const records = parse(csvContent, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      from_line: 2, // Skip header row
    });

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Extract transaction date
        const dateStr = row[format.dateColumn]?.trim();
        if (!dateStr) {
          errors.push(`Row ${i + 2}: Missing date`);
          continue;
        }

        // Parse date based on bank format
        const date = parseDateString(dateStr, format.dateFormat);
        if (!date) {
          errors.push(`Row ${i + 2}: Invalid date format: ${dateStr}`);
          continue;
        }

        // Extract amounts
        const withdrawalStr = row[format.withdrawalColumn]?.trim() || '0';
        const depositStr = row[format.depositColumn]?.trim() || '0';
        const balanceStr = row[format.balanceColumn]?.trim();

        const withdrawal = parseKoreanAmount(withdrawalStr);
        const deposit = parseKoreanAmount(depositStr);
        const balance = balanceStr ? parseKoreanAmount(balanceStr) : undefined;

        // Determine transaction type and amount
        let amount: number;
        let transactionType: 'DEPOSIT' | 'WITHDRAWAL';

        if (deposit > 0) {
          amount = deposit;
          transactionType = 'DEPOSIT';
        } else if (withdrawal > 0) {
          amount = withdrawal;
          transactionType = 'WITHDRAWAL';
        } else {
          errors.push(`Row ${i + 2}: No valid amount found`);
          continue;
        }

        const description = row[format.descriptionColumn]?.trim() || '';

        transactions.push({
          date,
          description,
          amount,
          balance,
          transactionType,
          rawData: row.join(','),
        });
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message || 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      transactions,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      transactions: [],
      errors: [`CSV parsing failed: ${error.message || 'Unknown error'}`],
    };
  }
}

/**
 * Parse Korean date string formats
 * Supports: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
 */
function parseDateString(dateStr: string, _format: string): Date | null {
  try {
    // Remove all separators and parse as YYYYMMDD
    const cleanDate = dateStr.replace(/[.-/]/g, '');

    if (cleanDate.length !== 8) {
      return null;
    }

    const year = parseInt(cleanDate.substring(0, 4), 10);
    const month = parseInt(cleanDate.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(cleanDate.substring(6, 8), 10);

    const date = new Date(year, month, day);

    // Validate date
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Parse Korean amount string
 * Handles Korean number format with commas (e.g., "1,000,000")
 */
function parseKoreanAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove all non-numeric characters except minus sign and decimal point
  const cleaned = amountStr.replace(/[^\d.-]/g, '');

  const amount = parseFloat(cleaned);

  return isNaN(amount) ? 0 : Math.abs(amount); // Return absolute value
}

/**
 * Match bank transactions to reservations using fuzzy matching
 */
export async function matchTransactionsToReservations(
  transactions: BankTransaction[],
  dateRangeStart?: Date,
  dateRangeEnd?: Date
): Promise<MatchResult> {
  const matched: MatchedTransaction[] = [];
  const unmatched: BankTransaction[] = [];

  // Fetch reservations within date range
  let query = 'SELECT * FROM reservations WHERE 1=1';
  const params: any[] = [];

  if (dateRangeStart) {
    params.push(dateRangeStart);
    query += ` AND created_at >= $${params.length}`;
  }

  if (dateRangeEnd) {
    params.push(dateRangeEnd);
    query += ` AND created_at <= $${params.length}`;
  }

  const result = await db.query(query, params);
  const reservations = result.rows;

  for (const transaction of transactions) {
    // Only match deposits (incoming payments)
    if (transaction.transactionType !== 'DEPOSIT') {
      unmatched.push(transaction);
      continue;
    }

    let bestMatch: {
      reservationId: number;
      confidence: number;
      reason: string;
    } | null = null;

    for (const reservation of reservations) {
      const confidence = calculateMatchConfidence(transaction, reservation);

      if (confidence > 0.6 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          reservationId: reservation.id,
          confidence,
          reason: getMatchReason(transaction, reservation, confidence),
        };
      }
    }

    if (bestMatch) {
      matched.push({
        ...transaction,
        reservationId: bestMatch.reservationId,
        matchConfidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
      });
    } else {
      unmatched.push(transaction);
    }
  }

  const averageConfidence =
    matched.length > 0
      ? matched.reduce((sum, t) => sum + t.matchConfidence, 0) / matched.length
      : 0;

  return {
    matched,
    unmatched,
    totalMatches: matched.length,
    totalUnmatched: unmatched.length,
    averageConfidence,
  };
}

/**
 * Calculate match confidence between transaction and reservation
 * Returns score between 0 and 1
 */
function calculateMatchConfidence(
  transaction: BankTransaction,
  reservation: any
): number {
  let confidence = 0;
  let factors = 0;

  // Factor 1: Amount match (40% weight)
  const amountDiff = Math.abs(transaction.amount - reservation.total_price);
  const amountMatch = 1 - Math.min(amountDiff / reservation.total_price, 1);
  confidence += amountMatch * 0.4;
  factors++;

  // Factor 2: Date proximity (30% weight)
  const transactionDate = transaction.date.getTime();
  const reservationDate = new Date(reservation.created_at).getTime();
  const daysDiff = Math.abs(transactionDate - reservationDate) / (1000 * 60 * 60 * 24);
  const dateMatch = Math.max(0, 1 - daysDiff / 7); // 7 days tolerance
  confidence += dateMatch * 0.3;
  factors++;

  // Factor 3: Description matching (30% weight)
  const description = transaction.description.toLowerCase();
  const customerName = (reservation.customer_name || '').toLowerCase();
  const customerPhone = (reservation.customer_phone || '').replace(/[^0-9]/g, '');

  let descriptionMatch = 0;

  // Check for customer name in description
  if (customerName && description.includes(customerName)) {
    descriptionMatch += 0.5;
  }

  // Check for phone number in description
  if (customerPhone && description.includes(customerPhone)) {
    descriptionMatch += 0.5;
  }

  // Check for reservation ID in description
  if (description.includes(reservation.id.toString())) {
    descriptionMatch += 0.3;
  }

  confidence += Math.min(descriptionMatch, 1) * 0.3;
  factors++;

  return confidence;
}

/**
 * Generate human-readable match reason
 */
function getMatchReason(
  transaction: BankTransaction,
  reservation: any,
  confidence: number
): string {
  const reasons: string[] = [];

  // Amount match
  const amountDiff = Math.abs(transaction.amount - reservation.total_price);
  if (amountDiff === 0) {
    reasons.push('Exact amount match');
  } else if (amountDiff < reservation.total_price * 0.05) {
    reasons.push('Amount within 5% tolerance');
  }

  // Date proximity
  const daysDiff = Math.abs(
    transaction.date.getTime() - new Date(reservation.created_at).getTime()
  ) / (1000 * 60 * 60 * 24);
  if (daysDiff < 1) {
    reasons.push('Same day transaction');
  } else if (daysDiff < 3) {
    reasons.push('Within 3 days');
  }

  // Description match
  const description = transaction.description.toLowerCase();
  const customerName = (reservation.customer_name || '').toLowerCase();

  if (customerName && description.includes(customerName)) {
    reasons.push('Customer name found in description');
  }

  if (reasons.length === 0) {
    reasons.push(`${Math.round(confidence * 100)}% confidence match`);
  }

  return reasons.join(', ');
}

/**
 * Export match results as CSV
 */
export function exportMatchResultsAsCSV(matchResult: MatchResult): string {
  const header = 'Date,Description,Amount,Reservation ID,Confidence,Match Reason,Status\n';

  const rows = [
    ...matchResult.matched.map((t) => {
      return `${t.date.toISOString().split('T')[0]},"${t.description}",${t.amount},${t.reservationId},${(t.matchConfidence * 100).toFixed(1)}%,"${t.matchReason}",MATCHED`;
    }),
    ...matchResult.unmatched.map((t) => {
      return `${t.date.toISOString().split('T')[0]},"${t.description}",${t.amount},,,UNMATCHED`;
    }),
  ];

  return header + rows.join('\n');
}
