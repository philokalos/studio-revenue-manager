/**
 * CSV Bank Matching E2E Tests
 * Tests for CSV upload, parsing, and transaction matching
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import { TestData } from '../utils/testData';
import pool from '../../db';
import path from 'path';
import fs from 'fs';

describe('CSV Bank Matching E2E Tests', () => {
  let authToken: string;
  let userId: string;
  const testFilesDir = path.join(__dirname, '../fixtures');

  beforeAll(async () => {
    await TestDb.clean();
    const { user, token } = await TestAuth.createUserWithToken('csvbank@test.com');
    authToken = token;
    userId = user.id;

    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await TestDb.clean();
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await TestData.cleanup();
    await pool.query('DELETE FROM csv_import_history');
  });

  describe('Upload CSV File', () => {
    it('should upload KB bank CSV file', async () => {
      const csvContent = TestData.generateBankCSV('KB');
      const filePath = path.join(testFilesDir, 'kb_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('importId');
      expect(response.body.data).toHaveProperty('transactionsCount');
    });

    it('should upload Shinhan bank CSV file', async () => {
      const csvContent = TestData.generateBankCSV('Shinhan');
      const filePath = path.join(testFilesDir, 'shinhan_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'Shinhan');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.transactionsCount).toBeGreaterThan(0);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('bankName', 'KB');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('file');
    });

    it('should reject unsupported bank format', async () => {
      const csvContent = 'date,amount\n2024-01-01,1000';
      const filePath = path.join(testFilesDir, 'invalid_bank.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'UnsupportedBank');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('bank');
    });
  });

  describe('Parse Different Bank Formats', () => {
    it('should correctly parse KB bank format', async () => {
      const csvContent = TestData.generateBankCSV('KB');
      const filePath = path.join(testFilesDir, 'kb_parse.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(200);

      // Verify transactions were created with correct fields
      const transactions = await pool.query(
        'SELECT * FROM bank_transactions ORDER BY transaction_date'
      );

      expect(transactions.rows.length).toBeGreaterThan(0);
      expect(transactions.rows[0]).toHaveProperty('transaction_date');
      expect(transactions.rows[0]).toHaveProperty('description');
      expect(transactions.rows[0]).toHaveProperty('amount');
      expect(transactions.rows[0].bank_name).toBe('KB');
    });

    it('should correctly parse Shinhan bank format', async () => {
      const csvContent = TestData.generateBankCSV('Shinhan');
      const filePath = path.join(testFilesDir, 'shinhan_parse.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'Shinhan');

      expect(response.status).toBe(200);

      // Verify Shinhan-specific fields
      const transactions = await pool.query(
        `SELECT * FROM bank_transactions
         WHERE bank_name = 'Shinhan'
         ORDER BY transaction_date`
      );

      expect(transactions.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Automatic Matching', () => {
    it('should automatically match transactions to invoices', async () => {
      // Create reservation and invoice
      const reservation = await TestData.createReservation();
      const invoice = await TestData.createInvoice(reservation.id, {
        totalAmount: 50000
      });

      // Upload CSV with matching transaction
      const csvContent = `거래일시,적요,출금,입금,잔액,거래점
2024-01-15,스튜디오 예약금,0,50000,1000000,강남점`;
      const filePath = path.join(testFilesDir, 'match_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB')
        .field('autoMatch', 'true');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('matchedCount');
      expect(response.body.data.matchedCount).toBeGreaterThan(0);
    });

    it('should handle partial amount matches', async () => {
      const reservation = await TestData.createReservation();
      await TestData.createInvoice(reservation.id, {
        totalAmount: 100000
      });

      // Upload CSV with partial payment
      const csvContent = `거래일시,적요,출금,입금,잔액,거래점
2024-01-15,스튜디오 예약금,0,50000,1000000,강남점`;
      const filePath = path.join(testFilesDir, 'partial_match.csv');
      fs.writeFileSync(filePath, csvContent);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB')
        .field('autoMatch', 'true');

      expect(response.status).toBe(200);
      // Should identify as potential match but not auto-confirm
    });
  });

  describe('Manual Match Confirmation', () => {
    it('should allow manual transaction-invoice matching', async () => {
      const transaction = await TestData.createBankTransaction({
        amount: 50000,
        description: '스튜디오 예약금'
      });

      const reservation = await TestData.createReservation();
      const invoice = await TestData.createInvoice(reservation.id, {
        totalAmount: 50000
      });

      const response = await request(app)
        .post('/api/csv-bank/match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId: transaction.id,
          invoiceId: invoice.id,
          matchType: 'manual'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('matchId');

      // Verify match was recorded
      const match = await pool.query(
        `SELECT * FROM transaction_matches
         WHERE transaction_id = $1 AND invoice_id = $2`,
        [transaction.id, invoice.id]
      );

      expect(match.rows.length).toBe(1);
      expect(match.rows[0].match_type).toBe('manual');
    });

    it('should reject invalid matches', async () => {
      const transaction = await TestData.createBankTransaction({
        amount: 50000
      });

      const response = await request(app)
        .post('/api/csv-bank/match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId: transaction.id,
          invoiceId: 'non-existent-invoice'
        });

      expect(response.status).toBe(404);
    });

    it('should prevent duplicate matches', async () => {
      const transaction = await TestData.createBankTransaction();
      const reservation = await TestData.createReservation();
      const invoice = await TestData.createInvoice(reservation.id);

      // First match
      await request(app)
        .post('/api/csv-bank/match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId: transaction.id,
          invoiceId: invoice.id
        });

      // Second match attempt
      const response = await request(app)
        .post('/api/csv-bank/match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId: transaction.id,
          invoiceId: invoice.id
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already matched');
    });
  });

  describe('Export Results', () => {
    it('should export matched transactions', async () => {
      // Create and match transactions
      const transaction = await TestData.createBankTransaction();
      const reservation = await TestData.createReservation();
      const invoice = await TestData.createInvoice(reservation.id);

      await pool.query(
        `INSERT INTO transaction_matches (transaction_id, invoice_id, match_type)
         VALUES ($1, $2, $3)`,
        [transaction.id, invoice.id, 'manual']
      );

      const response = await request(app)
        .get('/api/csv-bank/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'csv',
          matchStatus: 'matched'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('csv');
      expect(response.text).toContain('transaction_date');
    });

    it('should export unmatched transactions', async () => {
      await TestData.createBankTransaction();

      const response = await request(app)
        .get('/api/csv-bank/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'csv',
          matchStatus: 'unmatched'
        });

      expect(response.status).toBe(200);
    });

    it('should support JSON export format', async () => {
      const response = await request(app)
        .get('/api/csv-bank/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('json');
    });
  });

  describe('Import History', () => {
    it('should track import history', async () => {
      const csvContent = TestData.generateBankCSV('KB');
      const filePath = path.join(testFilesDir, 'history_test.csv');
      fs.writeFileSync(filePath, csvContent);

      await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      const response = await request(app)
        .get('/api/csv-bank/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.imports).toBeDefined();
      expect(Array.isArray(response.body.data.imports)).toBe(true);
      expect(response.body.data.imports.length).toBeGreaterThan(0);
    });

    it('should include import statistics', async () => {
      const csvContent = TestData.generateBankCSV('KB');
      const filePath = path.join(testFilesDir, 'stats_test.csv');
      fs.writeFileSync(filePath, csvContent);

      const uploadRes = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      const importId = uploadRes.body.data.importId;

      const response = await request(app)
        .get(`/api/csv-bank/history/${importId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalTransactions');
      expect(response.body.data).toHaveProperty('matchedCount');
      expect(response.body.data).toHaveProperty('unmatchedCount');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed CSV', async () => {
      const malformedCSV = 'invalid,csv\nwith,bad,structure';
      const filePath = path.join(testFilesDir, 'malformed.csv');
      fs.writeFileSync(filePath, malformedCSV);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('parse');
    });

    it('should handle duplicate transactions', async () => {
      const csvContent = TestData.generateBankCSV('KB');
      const filePath = path.join(testFilesDir, 'duplicate_test.csv');
      fs.writeFileSync(filePath, csvContent);

      // Upload twice
      await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('duplicatesSkipped');
    });

    it('should handle empty CSV file', async () => {
      const emptyCSV = '거래일시,적요,출금,입금,잔액,거래점\n';
      const filePath = path.join(testFilesDir, 'empty.csv');
      fs.writeFileSync(filePath, emptyCSV);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });

    it('should handle special characters in CSV', async () => {
      const specialCharsCSV = `거래일시,적요,출금,입금,잔액,거래점
2024-01-15,"스튜디오 ""특별"" 예약금",0,50000,1000000,강남점`;
      const filePath = path.join(testFilesDir, 'special_chars.csv');
      fs.writeFileSync(filePath, specialCharsCSV);

      const response = await request(app)
        .post('/api/csv-bank/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath)
        .field('bankName', 'KB');

      expect(response.status).toBe(200);
    });
  });
});
