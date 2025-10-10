/**
 * Test Data Factory
 * Factory functions for generating test data
 */
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db';

export class TestData {
  /**
   * Create a test quote
   */
  static async createQuote(overrides: Partial<any> = {}): Promise<any> {
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endAt = new Date(Date.now() + 26 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO quotes (start_at, end_at, people, channel, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        overrides.startAt || startAt,
        overrides.endAt || endAt,
        overrides.people || 5,
        overrides.channel || 'default',
        overrides.status || 'pending'
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test reservation
   */
  static async createReservation(overrides: Partial<any> = {}): Promise<any> {
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endAt = new Date(Date.now() + 26 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO reservations (start_at, end_at, people, channel, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        overrides.startAt || startAt,
        overrides.endAt || endAt,
        overrides.people || 5,
        overrides.channel || 'default',
        overrides.status || 'confirmed'
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test invoice
   */
  static async createInvoice(reservationId: string, overrides: Partial<any> = {}): Promise<any> {
    const result = await pool.query(
      `INSERT INTO invoices (reservation_id, total_amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        reservationId,
        overrides.totalAmount || 100000,
        overrides.status || 'pending'
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test bank transaction
   */
  static async createBankTransaction(overrides: Partial<any> = {}): Promise<any> {
    const result = await pool.query(
      `INSERT INTO bank_transactions (
        transaction_date, description, amount, balance, bank_name
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        overrides.transactionDate || new Date(),
        overrides.description || 'Test Transaction',
        overrides.amount || 50000,
        overrides.balance || 1000000,
        overrides.bankName || 'KB'
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test headcount change
   */
  static async createHeadcountChange(
    reservationId: string,
    overrides: Partial<any> = {}
  ): Promise<any> {
    const result = await pool.query(
      `INSERT INTO headcount_changes (
        reservation_id, old_count, new_count, change_reason, changed_at
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        reservationId,
        overrides.oldCount || 5,
        overrides.newCount || 7,
        overrides.changeReason || 'Test change',
        overrides.changedAt || new Date()
      ]
    );

    return result.rows[0];
  }

  /**
   * Generate valid CSV bank data
   */
  static generateBankCSV(bankName: 'KB' | 'Shinhan' = 'KB'): string {
    if (bankName === 'KB') {
      return `거래일시,적요,출금,입금,잔액,거래점
2024-01-15,스튜디오 예약금,0,50000,1000000,강남점
2024-01-16,스튜디오 잔금,0,100000,1100000,강남점`;
    } else {
      return `거래일,거래시간,적요,출금금액(원),입금금액(원),거래후잔액(원)
2024-01-15,14:30:25,스튜디오 예약금,0,50000,1000000
2024-01-16,15:45:10,스튜디오 잔금,0,100000,1100000`;
    }
  }

  /**
   * Clean up all test data
   */
  static async cleanup(): Promise<void> {
    await pool.query('DELETE FROM discount_logs');
    await pool.query('DELETE FROM invoice_items');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM headcount_changes');
    await pool.query('DELETE FROM calendar_sync_history');
    await pool.query('DELETE FROM reservations');
    await pool.query('DELETE FROM quotes');
    await pool.query('DELETE FROM csv_import_history');
    await pool.query('DELETE FROM bank_transactions');
  }
}
