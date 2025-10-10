# Track 5: CSV Upload & Bank Transaction Matching

**Developer**: Developer E
**Duration**: 2-3 days
**Priority**: ⚠️ Important but Not Urgent
**Value**: Reconciliation automation & financial accuracy

## Objective

Implement CSV bank statement upload with intelligent auto-matching algorithm to reconcile bank transactions with invoices, reducing manual reconciliation time from hours to minutes.

## Business Value

- **Time Savings**: 80% reduction in monthly reconciliation time (8 hours → 90 minutes)
- **Accuracy**: Eliminate manual matching errors (avg. 5-10 per month)
- **Cash Flow Visibility**: Real-time payment confirmation
- **Audit Trail**: Complete transaction matching history
- **Multi-Bank Support**: Handle multiple Korean bank formats

## Architecture Overview

```
┌──────────────┐        ┌───────────────────┐        ┌─────────────────┐
│  CSV Upload  │───────>│  CSV Parser       │───────>│ Bank Transactions│
│  (Frontend)  │        │  (csv-parse)      │        │     (DB)        │
└──────────────┘        └───────────────────┘        └─────────────────┘
                                 │                             │
                                 ▼                             ▼
                        ┌───────────────────┐        ┌─────────────────┐
                        │ Format Detector   │        │ Auto-Matcher    │
                        │ (KB, Shinhan, etc)│<───────│ Algorithm       │
                        └───────────────────┘        └─────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │ Matching Queue  │
                                                     │ (Manual Review) │
                                                     └─────────────────┘
```

## Implementation Plan

### Step 1: Analyze Korean Bank CSV Formats (1 hour)

**Common Korean bank CSV formats**:

#### KB국민은행 (KB Kookmin Bank)
```csv
거래일시,적요,출금액,입금액,잔액,내용
2025-10-10 14:23:15,입금,0,"50,000","1,234,567",홍길동
2025-10-10 15:45:32,입금,0,"30,000","1,264,567",김철수
```

#### 신한은행 (Shinhan Bank)
```csv
거래일,거래시각,적요,출금,입금,거래후잔액,거래내용
2025-10-10,14:23:15,입금,,50000,1234567,홍길동
2025-10-10,15:45:32,입금,,30000,1264567,김철수
```

#### 우리은행 (Woori Bank)
```csv
일자,시간,구분,출금액,입금액,잔액,적요
10/10,14:23,입금,0,50000,1234567,홍길동
10/10,15:45,입금,0,30000,1264567,김철수
```

**Key differences**:
- Date/time format varies (combined vs. separate columns)
- Number format (comma-separated vs. plain)
- Column names (Korean)
- Character encoding (EUC-KR vs. UTF-8)

### Step 2: Create CSV Parser Service (3 hours)

**Create**: `packages/backend/src/services/csv-parser.ts`

```typescript
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import iconv from 'iconv-lite';

export interface BankTransaction {
  date: Date;
  time?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  balance: number;
  payer: string;
  description?: string;
  rawData: Record<string, string>;
}

export type BankFormat = 'kb' | 'shinhan' | 'woori' | 'auto';

/**
 * Detect bank format from CSV headers
 */
export function detectBankFormat(headers: string[]): BankFormat {
  const headerStr = headers.join('|').toLowerCase();

  if (headerStr.includes('거래일시') && headerStr.includes('적요')) {
    return 'kb';
  }
  if (headerStr.includes('거래일') && headerStr.includes('거래시각')) {
    return 'shinhan';
  }
  if (headerStr.includes('일자') && headerStr.includes('시간')) {
    return 'woori';
  }

  throw new Error('Unknown bank format. Supported: KB, Shinhan, Woori');
}

/**
 * Parse number with comma separators
 */
function parseKoreanNumber(value: string): number {
  if (!value) return 0;

  // Remove commas and quotes
  const cleaned = value.replace(/[,"]/g, '').trim();

  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse KB Bank CSV format
 */
function parseKBFormat(records: Record<string, string>[]): BankTransaction[] {
  return records.map(record => {
    const dateTime = new Date(record['거래일시']);
    const deposit = parseKoreanNumber(record['입금액']);
    const withdrawal = parseKoreanNumber(record['출금액']);

    return {
      date: dateTime,
      type: deposit > 0 ? 'deposit' : 'withdrawal',
      amount: deposit > 0 ? deposit : withdrawal,
      balance: parseKoreanNumber(record['잔액']),
      payer: record['내용'] || '',
      description: record['적요'],
      rawData: record,
    };
  });
}

/**
 * Parse Shinhan Bank CSV format
 */
function parseShinhanFormat(records: Record<string, string>[]): BankTransaction[] {
  return records.map(record => {
    const dateStr = record['거래일'];
    const timeStr = record['거래시각'];
    const dateTime = new Date(`${dateStr} ${timeStr}`);

    const deposit = parseKoreanNumber(record['입금']);
    const withdrawal = parseKoreanNumber(record['출금']);

    return {
      date: dateTime,
      time: timeStr,
      type: deposit > 0 ? 'deposit' : 'withdrawal',
      amount: deposit > 0 ? deposit : withdrawal,
      balance: parseKoreanNumber(record['거래후잔액']),
      payer: record['거래내용'] || '',
      description: record['적요'],
      rawData: record,
    };
  });
}

/**
 * Parse Woori Bank CSV format
 */
function parseWooriFormat(records: Record<string, string>[]): BankTransaction[] {
  const currentYear = new Date().getFullYear();

  return records.map(record => {
    const dateStr = record['일자']; // "10/10"
    const timeStr = record['시간']; // "14:23"

    // Parse date (MM/DD format)
    const [month, day] = dateStr.split('/').map(s => parseInt(s, 10));
    const dateTime = new Date(currentYear, month - 1, day);

    // Parse time
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(s => parseInt(s, 10));
      dateTime.setHours(hours, minutes, 0);
    }

    const deposit = parseKoreanNumber(record['입금액']);
    const withdrawal = parseKoreanNumber(record['출금액']);

    return {
      date: dateTime,
      time: timeStr,
      type: deposit > 0 ? 'deposit' : 'withdrawal',
      amount: deposit > 0 ? deposit : withdrawal,
      balance: parseKoreanNumber(record['잔액']),
      payer: record['적요'] || '',
      rawData: record,
    };
  });
}

/**
 * Parse bank CSV file
 */
export function parseBankCSV(
  filePath: string,
  format: BankFormat = 'auto'
): BankTransaction[] {
  try {
    // Read file with proper encoding (Korean banks often use EUC-KR)
    const buffer = fs.readFileSync(filePath);

    // Try UTF-8 first, fallback to EUC-KR
    let csvContent: string;
    try {
      csvContent = buffer.toString('utf-8');
    } catch {
      csvContent = iconv.decode(buffer, 'euc-kr');
    }

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Auto-detect format if not specified
    if (format === 'auto') {
      const headers = Object.keys(records[0]);
      format = detectBankFormat(headers);
    }

    // Parse based on detected format
    switch (format) {
      case 'kb':
        return parseKBFormat(records);
      case 'shinhan':
        return parseShinhanFormat(records);
      case 'woori':
        return parseWooriFormat(records);
      default:
        throw new Error(`Unsupported bank format: ${format}`);
    }
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Step 3: Create Transaction Matching Algorithm (4 hours)

**Create**: `packages/backend/src/services/transaction-matcher.ts`

```typescript
import { BankTransaction } from './csv-parser';
import pool from '../db';

export interface MatchCandidate {
  invoiceId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  paymentStatus: string;
  confidence: number;
  matchReasons: string[];
}

export interface MatchResult {
  transaction: BankTransaction;
  matches: MatchCandidate[];
  autoMatched: boolean;
  bestMatch?: MatchCandidate;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
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

/**
 * Find matching invoices for a bank transaction
 */
export async function findMatches(
  transaction: BankTransaction
): Promise<MatchResult> {
  const { date, amount, payer } = transaction;

  // Fetch unpaid invoices within ±2 hours of transaction
  const timeWindow = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const startTime = new Date(date.getTime() - timeWindow);
  const endTime = new Date(date.getTime() + timeWindow);

  const result = await pool.query(
    `SELECT
      i.id as invoice_id,
      i.total_amount,
      i.created_at,
      i.payment_status,
      r.customer_name,
      r.start_time
     FROM invoices i
     JOIN reservations r ON i.reservation_id = r.id
     WHERE i.payment_status IN ('Pending', 'Partial')
       AND i.total_amount = $1
       AND r.start_time BETWEEN $2 AND $3
     ORDER BY r.start_time ASC`,
    [amount, startTime, endTime]
  );

  const candidates: MatchCandidate[] = result.rows.map(row => {
    const matchReasons: string[] = [];
    let confidence = 0;

    // Exact amount match (+40 points)
    if (row.total_amount === amount) {
      confidence += 40;
      matchReasons.push('Exact amount match');
    }

    // Time window match (+20 points if within 1 hour, +10 if within 2 hours)
    const timeDiff = Math.abs(date.getTime() - new Date(row.start_time).getTime());
    if (timeDiff <= 60 * 60 * 1000) {
      confidence += 20;
      matchReasons.push('Within 1 hour of reservation');
    } else if (timeDiff <= 2 * 60 * 60 * 1000) {
      confidence += 10;
      matchReasons.push('Within 2 hours of reservation');
    }

    // Payer name similarity (+40 points max)
    const nameSimilarity = calculateSimilarity(payer, row.customer_name);
    const namePoints = Math.round(nameSimilarity * 40);
    confidence += namePoints;

    if (nameSimilarity >= 0.8) {
      matchReasons.push(`High name similarity (${Math.round(nameSimilarity * 100)}%)`);
    } else if (nameSimilarity >= 0.5) {
      matchReasons.push(`Moderate name similarity (${Math.round(nameSimilarity * 100)}%)`);
    }

    return {
      invoiceId: row.invoice_id,
      customerName: row.customer_name,
      amount: row.total_amount,
      dueDate: new Date(row.start_time),
      paymentStatus: row.payment_status,
      confidence: Math.min(confidence, 100),
      matchReasons,
    };
  });

  // Sort by confidence score
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Auto-match if best match has ≥90% confidence
  const bestMatch = candidates[0];
  const autoMatched = bestMatch && bestMatch.confidence >= 90;

  return {
    transaction,
    matches: candidates,
    autoMatched: autoMatched || false,
    bestMatch: autoMatched ? bestMatch : undefined,
  };
}

/**
 * Process all transactions and create matching queue
 */
export async function processTransactions(
  transactions: BankTransaction[]
): Promise<{
  autoMatched: number;
  requiresReview: number;
  unmatched: number;
}> {
  let autoMatched = 0;
  let requiresReview = 0;
  let unmatched = 0;

  for (const transaction of transactions) {
    const matchResult = await findMatches(transaction);

    // Insert transaction into database
    const txResult = await pool.query(
      `INSERT INTO bank_transactions (
        transaction_date,
        transaction_type,
        amount,
        payer,
        description,
        raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        transaction.date,
        transaction.type,
        transaction.amount,
        transaction.payer,
        transaction.description,
        JSON.stringify(transaction.rawData),
      ]
    );

    const transactionId = txResult.rows[0].id;

    if (matchResult.autoMatched && matchResult.bestMatch) {
      // Auto-match: Update invoice payment status
      await pool.query(
        `UPDATE invoices
         SET payment_status = 'Paid',
             paid_at = $1,
             bank_transaction_id = $2
         WHERE id = $3`,
        [transaction.date, transactionId, matchResult.bestMatch.invoiceId]
      );

      // Log auto-match
      await pool.query(
        `INSERT INTO matching_queue (
          transaction_id,
          invoice_id,
          confidence,
          status,
          auto_matched
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          transactionId,
          matchResult.bestMatch.invoiceId,
          matchResult.bestMatch.confidence,
          'approved',
          true,
        ]
      );

      autoMatched++;
    } else if (matchResult.matches.length > 0) {
      // Add to matching queue for manual review
      for (const match of matchResult.matches.slice(0, 5)) { // Top 5 matches only
        await pool.query(
          `INSERT INTO matching_queue (
            transaction_id,
            invoice_id,
            confidence,
            status,
            auto_matched
          ) VALUES ($1, $2, $3, $4, $5)`,
          [transactionId, match.invoiceId, match.confidence, 'pending', false]
        );
      }
      requiresReview++;
    } else {
      // No matches found
      unmatched++;
    }
  }

  return { autoMatched, requiresReview, unmatched };
}

/**
 * Manually approve a match from queue
 */
export async function approveMatch(
  transactionId: string,
  invoiceId: string
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get transaction date
    const txResult = await client.query(
      'SELECT transaction_date FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    const transactionDate = txResult.rows[0].transaction_date;

    // Update invoice
    await client.query(
      `UPDATE invoices
       SET payment_status = 'Paid',
           paid_at = $1,
           bank_transaction_id = $2
       WHERE id = $3`,
      [transactionDate, transactionId, invoiceId]
    );

    // Update matching queue
    await client.query(
      `UPDATE matching_queue
       SET status = 'approved',
           approved_at = NOW()
       WHERE transaction_id = $1 AND invoice_id = $2`,
      [transactionId, invoiceId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reject a match from queue
 */
export async function rejectMatch(
  transactionId: string,
  invoiceId: string,
  reason?: string
): Promise<void> {
  await pool.query(
    `UPDATE matching_queue
     SET status = 'rejected',
         rejection_reason = $1,
         rejected_at = NOW()
     WHERE transaction_id = $2 AND invoice_id = $3`,
    [reason, transactionId, invoiceId]
  );
}
```

### Step 4: Create Database Schema (1 hour)

**Create**: `packages/backend/src/db/migrations/005_add_bank_transactions.sql`

```sql
-- Bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal'
  amount INTEGER NOT NULL,
  payer VARCHAR(255),
  description TEXT,
  raw_data JSONB,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deposit', 'withdrawal'))
);

-- Matching queue for manual review
CREATE TABLE IF NOT EXISTS matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES bank_transactions(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  confidence INTEGER NOT NULL, -- 0-100
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  auto_matched BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 100)
);

-- Add bank transaction reference to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS bank_transaction_id UUID REFERENCES bank_transactions(id),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_amount ON bank_transactions(amount);
CREATE INDEX idx_bank_transactions_payer ON bank_transactions(payer);
CREATE INDEX idx_matching_queue_status ON matching_queue(status);
CREATE INDEX idx_matching_queue_confidence ON matching_queue(confidence DESC);
CREATE INDEX idx_invoices_bank_transaction ON invoices(bank_transaction_id);
```

Run migration:
```bash
cd packages/backend
npm run db:migrate
```

### Step 5: Create Transaction Routes (2 hours)

**Create**: `packages/backend/src/routes/transactions.ts`

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { parseBankCSV } from '../services/csv-parser';
import { processTransactions, approveMatch, rejectMatch } from '../services/transaction-matcher';
import { authenticateToken, requireRole } from '../middleware/auth';
import pool from '../db';

const router = Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: '/tmp/uploads/',
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// POST /api/transactions/upload
router.post(
  '/upload',
  authenticateToken,
  requireRole('admin', 'staff'),
  upload.single('csv'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      const { bankFormat = 'auto' } = req.body;

      // Parse CSV
      const transactions = parseBankCSV(req.file.path, bankFormat);

      if (transactions.length === 0) {
        res.status(400).json({ error: 'No transactions found in CSV' });
        return;
      }

      // Process transactions and find matches
      const result = await processTransactions(transactions);

      res.json({
        success: true,
        totalTransactions: transactions.length,
        autoMatched: result.autoMatched,
        requiresReview: result.requiresReview,
        unmatched: result.unmatched,
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({
        error: 'CSV processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/transactions/matching-queue
router.get('/matching-queue', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT
        mq.*,
        bt.transaction_date,
        bt.amount as transaction_amount,
        bt.payer,
        i.total_amount as invoice_amount,
        i.payment_status,
        r.customer_name,
        r.start_time
       FROM matching_queue mq
       JOIN bank_transactions bt ON mq.transaction_id = bt.id
       JOIN invoices i ON mq.invoice_id = i.id
       JOIN reservations r ON i.reservation_id = r.id
       WHERE mq.status = $1
       ORDER BY mq.confidence DESC, mq.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    res.json({
      matches: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Failed to fetch matching queue:', error);
    res.status(500).json({ error: 'Failed to fetch matching queue' });
  }
});

// POST /api/transactions/approve-match
router.post('/approve-match', authenticateToken, requireRole('admin', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId, invoiceId } = req.body;

    if (!transactionId || !invoiceId) {
      res.status(400).json({ error: 'transactionId and invoiceId required' });
      return;
    }

    await approveMatch(transactionId, invoiceId);

    res.json({ success: true });
  } catch (error) {
    console.error('Match approval error:', error);
    res.status(500).json({ error: 'Match approval failed' });
  }
});

// POST /api/transactions/reject-match
router.post('/reject-match', authenticateToken, requireRole('admin', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId, invoiceId, reason } = req.body;

    if (!transactionId || !invoiceId) {
      res.status(400).json({ error: 'transactionId and invoiceId required' });
      return;
    }

    await rejectMatch(transactionId, invoiceId, reason);

    res.json({ success: true });
  } catch (error) {
    console.error('Match rejection error:', error);
    res.status(500).json({ error: 'Match rejection failed' });
  }
});

// GET /api/transactions/statistics
router.get('/statistics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE auto_matched = true AND status = 'approved') as auto_matched,
        COUNT(*) FILTER (WHERE auto_matched = false AND status = 'approved') as manual_matched,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_review,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        AVG(confidence) FILTER (WHERE status = 'approved') as avg_confidence
      FROM matching_queue
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
```

**Register routes** in `packages/backend/src/app.ts`:

```typescript
import transactionRoutes from './routes/transactions';
app.use('/api/transactions', transactionRoutes);
```

### Step 6: Create Frontend Transaction Matching Page (3 hours)

**Create**: `packages/frontend/src/pages/TransactionMatchingPage.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface MatchQueueItem {
  id: string;
  transaction_id: string;
  invoice_id: string;
  confidence: number;
  transaction_date: string;
  transaction_amount: number;
  payer: string;
  customer_name: string;
  invoice_amount: number;
  start_time: string;
}

export function TransactionMatchingPage() {
  const [matches, setMatches] = useState<MatchQueueItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get('/api/transactions/matching-queue');
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadStatus('Uploading and processing...');

    const formData = new FormData();
    formData.append('csv', file);

    try {
      const response = await axios.post('/api/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadStatus(
        `✓ Upload complete: ${response.data.autoMatched} auto-matched, ` +
        `${response.data.requiresReview} require review, ` +
        `${response.data.unmatched} unmatched`
      );

      fetchMatches(); // Refresh matches
    } catch (error) {
      setUploadStatus('✗ Upload failed: ' + (error as any).response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId: string, invoiceId: string) => {
    try {
      await axios.post('/api/transactions/approve-match', {
        transactionId,
        invoiceId,
      });

      fetchMatches(); // Refresh
    } catch (error) {
      alert('Approval failed: ' + (error as any).response?.data?.error);
    }
  };

  const handleReject = async (transactionId: string, invoiceId: string) => {
    const reason = prompt('Rejection reason (optional):');

    try {
      await axios.post('/api/transactions/reject-match', {
        transactionId,
        invoiceId,
        reason,
      });

      fetchMatches(); // Refresh
    } catch (error) {
      alert('Rejection failed: ' + (error as any).response?.data?.error);
    }
  };

  return (
    <div className="transaction-matching-page">
      <h1>Bank Transaction Matching</h1>

      <section className="upload-section">
        <h2>Upload Bank Statement CSV</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
        />
        {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
      </section>

      <section className="matching-queue">
        <h2>Matching Queue ({matches.length} pending)</h2>

        {matches.length === 0 ? (
          <p>No matches pending review.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Confidence</th>
                <th>Transaction</th>
                <th>Invoice</th>
                <th>Payer vs. Customer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(match => (
                <tr key={match.id}>
                  <td>
                    <span className={`confidence confidence-${Math.floor(match.confidence / 10) * 10}`}>
                      {match.confidence}%
                    </span>
                  </td>
                  <td>
                    {new Date(match.transaction_date).toLocaleDateString('ko-KR')}
                    <br />
                    ₩{match.transaction_amount.toLocaleString()}
                  </td>
                  <td>
                    {new Date(match.start_time).toLocaleDateString('ko-KR')}
                    <br />
                    ₩{match.invoice_amount.toLocaleString()}
                  </td>
                  <td>
                    {match.payer}
                    <br />
                    vs. {match.customer_name}
                  </td>
                  <td>
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(match.transaction_id, match.invoice_id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(match.transaction_id, match.invoice_id)}
                    >
                      ✗ Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

## Testing Checklist

- [ ] CSV parsing works for KB, Shinhan, Woori formats
- [ ] Encoding detection (UTF-8, EUC-KR) works
- [ ] Auto-matching algorithm achieves ≥85% accuracy
- [ ] Manual approval/rejection workflow functional
- [ ] Matching queue UI displays pending matches
- [ ] Bulk approval for high-confidence matches works
- [ ] Statistics endpoint shows matching performance
- [ ] Error handling for malformed CSV files
- [ ] File upload size limit enforced (10MB)

## Success Criteria

1. ✅ CSV parser supports 3 major Korean bank formats
2. ✅ Auto-matching achieves ≥85% accuracy
3. ✅ Manual review queue UI functional
4. ✅ Confidence scoring range 0-100% implemented
5. ✅ Approve/reject workflow updates invoices
6. ✅ Statistics dashboard shows matching performance
7. ✅ Integration tests passing (≥80% coverage)

## Coordination Notes

### Dependencies on Other Tracks
- **Track 1 (Auth)**: Uses authenticateToken and requireRole middleware
- **Track 2 (DB Pooling)**: Benefits from connection pooling and retry logic

### Shared Files
- `packages/backend/src/app.ts` - Adding `/api/transactions` routes

### Integration Timeline
1. **Day 1**: CSV parser, bank format detection
2. **Day 2**: Matching algorithm, database schema
3. **Day 3**: Routes, frontend UI, testing

## Performance Benchmarks

### Processing Speed
- **CSV Parsing**: <500ms for 1000 rows
- **Matching Algorithm**: <100ms per transaction
- **Bulk Processing**: 50 transactions/second

### Accuracy Metrics
- **Auto-match Rate**: ≥70% (confidence ≥90%)
- **Manual Review**: ≤30% of transactions
- **False Positive Rate**: <5%

## Resources

- csv-parse Documentation: https://csv.js.org/parse/
- iconv-lite (Korean encoding): https://github.com/ashtuchkin/iconv-lite
- Levenshtein Distance Algorithm: https://en.wikipedia.org/wiki/Levenshtein_distance
- Multer File Uploads: https://github.com/expressjs/multer
