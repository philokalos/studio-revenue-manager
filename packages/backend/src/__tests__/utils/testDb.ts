/**
 * Test Database Utilities
 * Helpers for test database setup, teardown, and seeding
 */
import pool from '../../db';

export class TestDb {
  /**
   * Clean all test data from database
   */
  static async clean(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Disable foreign key checks temporarily
      await client.query('SET CONSTRAINTS ALL DEFERRED');

      // Delete in order of dependencies
      await client.query('DELETE FROM discount_logs');
      await client.query('DELETE FROM invoice_items');
      await client.query('DELETE FROM invoices');
      await client.query('DELETE FROM headcount_changes');
      await client.query('DELETE FROM calendar_sync_history');
      await client.query('DELETE FROM reservations');
      await client.query('DELETE FROM quotes');
      await client.query('DELETE FROM csv_import_history');
      await client.query('DELETE FROM bank_transactions');
      await client.query(`DELETE FROM users WHERE email LIKE '%test%'`);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Seed database with minimal test data
   */
  static async seed(): Promise<void> {
    // Add any common test data here if needed
  }

  /**
   * Execute query within transaction that auto-rollbacks
   */
  static async withTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('ROLLBACK'); // Always rollback test transactions
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is accessible
   */
  static async isConnected(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT NOW()');
      return !!result.rows[0];
    } catch {
      return false;
    }
  }

  /**
   * Get row count for table
   */
  static async count(tableName: string): Promise<number> {
    const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }
}
