/**
 * CSV Bank Matching Routes
 * Track 5: CSV transaction import and matching
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  parseBankCSV,
  matchTransactionsToReservations,
  exportMatchResultsAsCSV,
  BankTransaction,
} from '../services/csv-parser';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * Upload and parse bank CSV file
 * POST /api/csv-bank/upload
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { bankType = 'DEFAULT' } = req.body;

      // Parse CSV file
      const csvContent = req.file.buffer.toString('utf-8');
      const parseResult = await parseBankCSV(csvContent, bankType);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'CSV parsing failed',
          errors: parseResult.errors,
        });
      }

      // Store transactions in database
      const storedTransactions = [];

      for (const transaction of parseResult.transactions) {
        const result = await db.query(
          'INSERT INTO bank_transactions (transaction_date, description, amount, balance, transaction_type, raw_data, bank_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.balance,
            transaction.transactionType,
            transaction.rawData,
            bankType,
          ]
        );

        storedTransactions.push(result.rows[0]);
      }

      // Log CSV import
      await db.query(
        'INSERT INTO csv_import_log (filename, bank_type, total_rows, successful_rows, failed_rows, errors, imported_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.file.originalname,
          bankType,
          parseResult.transactions.length + parseResult.errors.length,
          parseResult.transactions.length,
          parseResult.errors.length,
          parseResult.errors,
          req.user?.id,
        ]
      );

      return res.json({
        success: true,
        totalTransactions: parseResult.transactions.length,
        errors: parseResult.errors,
        transactions: storedTransactions,
      });
    } catch (error: any) {
      console.error('CSV upload error:', error);
      return res.status(500).json({ error: 'Failed to process CSV file' });
    }
  }
);

/**
 * Match transactions to reservations
 * POST /api/csv-bank/match
 */
router.post('/match', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionIds } = req.body;

    let transactions: BankTransaction[] = [];

    if (transactionIds && Array.isArray(transactionIds)) {
      // Match specific transactions
      const result = await db.query(
        'SELECT * FROM bank_transactions WHERE id = ANY($1::int[])',
        [transactionIds]
      );

      transactions = result.rows.map((row) => ({
        date: new Date(row.transaction_date),
        description: row.description,
        amount: parseFloat(row.amount),
        balance: row.balance ? parseFloat(row.balance) : undefined,
        transactionType: row.transaction_type,
        rawData: row.raw_data,
      }));
    } else {
      // Match all unmatched transactions
      const result = await db.query(
        'SELECT * FROM bank_transactions WHERE id NOT IN (SELECT bank_transaction_id FROM transaction_matches) ORDER BY transaction_date DESC'
      );

      transactions = result.rows.map((row) => ({
        date: new Date(row.transaction_date),
        description: row.description,
        amount: parseFloat(row.amount),
        balance: row.balance ? parseFloat(row.balance) : undefined,
        transactionType: row.transaction_type,
        rawData: row.raw_data,
      }));
    }

    // Perform matching
    const matchResult = await matchTransactionsToReservations(
      transactions,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Store matches in database
    for (const match of matchResult.matched) {
      // Get original transaction ID
      const txResult = await db.query(
        'SELECT id FROM bank_transactions WHERE transaction_date = $1 AND amount = $2 AND description = $3 LIMIT 1',
        [match.date, match.amount, match.description]
      );

      if (txResult.rows.length > 0) {
        const bankTransactionId = txResult.rows[0].id;

        await db.query(
          'INSERT INTO transaction_matches (bank_transaction_id, reservation_id, match_confidence, match_reason, match_status, matched_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (bank_transaction_id, reservation_id) DO UPDATE SET match_confidence = $3, match_reason = $4, matched_at = CURRENT_TIMESTAMP',
          [
            bankTransactionId,
            match.reservationId,
            match.matchConfidence,
            match.matchReason,
            'AUTO',
            req.user?.id,
          ]
        );
      }
    }

    // Update CSV import log with match results
    if (!transactionIds) {
      await db.query(
        'UPDATE csv_import_log SET total_matches = $1, average_confidence = $2 WHERE id = (SELECT MAX(id) FROM csv_import_log WHERE imported_by = $3)',
        [matchResult.totalMatches, matchResult.averageConfidence, req.user?.id]
      );
    }

    return res.json({
      success: true,
      totalMatched: matchResult.totalMatches,
      totalUnmatched: matchResult.totalUnmatched,
      averageConfidence: matchResult.averageConfidence,
      matched: matchResult.matched,
      unmatched: matchResult.unmatched,
    });
  } catch (error: any) {
    console.error('Transaction matching error:', error);
    return res.status(500).json({ error: 'Failed to match transactions' });
  }
});

/**
 * Get all transaction matches
 * GET /api/csv-bank/matches
 */
router.get('/matches', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, minConfidence } = req.query;

    let query = `
      SELECT
        tm.*,
        bt.transaction_date,
        bt.description,
        bt.amount,
        bt.transaction_type,
        r.customer_name,
        r.total_price,
        r.start_time,
        r.end_time
      FROM transaction_matches tm
      JOIN bank_transactions bt ON tm.bank_transaction_id = bt.id
      JOIN reservations r ON tm.reservation_id = r.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND tm.match_status = $${params.length}`;
    }

    if (minConfidence) {
      params.push(parseFloat(minConfidence as string));
      query += ` AND tm.match_confidence >= $${params.length}`;
    }

    query += ' ORDER BY tm.matched_at DESC';

    const result = await db.query(query, params);

    return res.json({
      matches: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Get matches error:', error);
    return res.status(500).json({ error: 'Failed to retrieve matches' });
  }
});

/**
 * Confirm or reject a match
 * PATCH /api/csv-bank/matches/:id
 */
router.patch('/matches/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['MANUAL', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be MANUAL or REJECTED' });
    }

    const result = await db.query(
      'UPDATE transaction_matches SET match_status = $1, matched_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, req.user?.id, parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.json({
      success: true,
      match: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update match status error:', error);
    return res.status(500).json({ error: 'Failed to update match status' });
  }
});

/**
 * Export match results as CSV
 * GET /api/csv-bank/export
 */
router.get('/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Fetch all transactions and their match status
    let transactionsQuery = 'SELECT * FROM bank_transactions WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      transactionsQuery += ` AND transaction_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      transactionsQuery += ` AND transaction_date <= $${params.length}`;
    }

    transactionsQuery += ' ORDER BY transaction_date DESC';

    const transactionsResult = await db.query(transactionsQuery, params);

    // Fetch match information
    const matchesResult = await db.query(
      'SELECT * FROM transaction_matches WHERE bank_transaction_id = ANY($1::int[])',
      [transactionsResult.rows.map((row) => row.id)]
    );

    const matchesMap = new Map();
    matchesResult.rows.forEach((match) => {
      matchesMap.set(match.bank_transaction_id, match);
    });

    // Categorize transactions
    const matched: any[] = [];
    const unmatched: any[] = [];

    for (const row of transactionsResult.rows) {
      const transaction: BankTransaction = {
        date: new Date(row.transaction_date),
        description: row.description,
        amount: parseFloat(row.amount),
        balance: row.balance ? parseFloat(row.balance) : undefined,
        transactionType: row.transaction_type,
        rawData: row.raw_data,
      };

      const match = matchesMap.get(row.id);

      if (match) {
        matched.push({
          ...transaction,
          reservationId: match.reservation_id,
          matchConfidence: parseFloat(match.match_confidence),
          matchReason: match.match_reason,
        });
      } else {
        unmatched.push(transaction);
      }
    }

    const matchResult = {
      matched,
      unmatched,
      totalMatches: matched.length,
      totalUnmatched: unmatched.length,
      averageConfidence:
        matched.length > 0
          ? matched.reduce((sum, m) => sum + m.matchConfidence, 0) / matched.length
          : 0,
    };

    const csvContent = exportMatchResultsAsCSV(matchResult);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transaction-matches.csv');

    return res.send(csvContent);
  } catch (error: any) {
    console.error('Export matches error:', error);
    return res.status(500).json({ error: 'Failed to export matches' });
  }
});

/**
 * Get CSV import history
 * GET /api/csv-bank/history
 */
router.get('/history', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM csv_import_log ORDER BY imported_at DESC LIMIT 50'
    );

    return res.json({
      imports: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Get import history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve import history' });
  }
});

export default router;
