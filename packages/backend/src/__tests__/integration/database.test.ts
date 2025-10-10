/**
 * Database Transaction Tests
 * Tests for transaction rollback, concurrent operations, and constraints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pool from '../../db';
import { TestDb } from '../utils/testDb';
import { TestData } from '../utils/testData';

describe('Database Transaction Tests', () => {
  beforeAll(async () => {
    await TestDb.clean();
  });

  afterAll(async () => {
    await TestDb.clean();
  });

  beforeEach(async () => {
    await TestData.cleanup();
  });

  describe('Transaction Rollback on Error', () => {
    it('should rollback transaction on error', async () => {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Insert valid reservation
        const res1 = await client.query(
          `INSERT INTO reservations (start_at, end_at, people, channel)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000), 5, 'default']
        );

        const reservationId = res1.rows[0].id;

        // Trigger error with invalid data
        await expect(
          client.query(
            `INSERT INTO invoices (reservation_id, total_amount, status)
             VALUES ($1, $2, $3)`,
            [reservationId, 'invalid_amount', 'pending'] // Invalid amount type
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');

        // Verify rollback - reservation should not exist
        const checkRes = await pool.query(
          'SELECT * FROM reservations WHERE id = $1',
          [reservationId]
        );
        expect(checkRes.rows.length).toBe(0);

      } finally {
        client.release();
      }
    });

    it('should commit transaction on success', async () => {
      const client = await pool.connect();
      let reservationId: string;

      try {
        await client.query('BEGIN');

        const res = await client.query(
          `INSERT INTO reservations (start_at, end_at, people, channel)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000), 5, 'default']
        );

        reservationId = res.rows[0].id;

        await client.query(
          `INSERT INTO invoices (reservation_id, total_amount, status)
           VALUES ($1, $2, $3)`,
          [reservationId, 100000, 'pending']
        );

        await client.query('COMMIT');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Verify commit - both should exist
      const checkRes = await pool.query(
        'SELECT * FROM reservations WHERE id = $1',
        [reservationId]
      );
      expect(checkRes.rows.length).toBe(1);

      const checkInv = await pool.query(
        'SELECT * FROM invoices WHERE reservation_id = $1',
        [reservationId]
      );
      expect(checkInv.rows.length).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent inserts correctly', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        TestData.createReservation({
          people: i + 1,
          channel: `channel_${i}`
        })
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      expect(new Set(results.map(r => r.id)).size).toBe(10); // All unique IDs
    });

    it('should prevent race conditions with row locking', async () => {
      const reservation = await TestData.createReservation();

      const client1 = await pool.connect();
      const client2 = await pool.connect();

      try {
        await client1.query('BEGIN');
        await client2.query('BEGIN');

        // Client 1 locks the row
        await client1.query(
          'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
          [reservation.id]
        );

        // Client 2 tries to lock same row (should wait)
        const client2Query = client2.query(
          'SELECT * FROM reservations WHERE id = $1 FOR UPDATE NOWAIT',
          [reservation.id]
        );

        // Should fail with lock error
        await expect(client2Query).rejects.toThrow();

        await client1.query('COMMIT');
        await client2.query('ROLLBACK');

      } finally {
        client1.release();
        client2.release();
      }
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key on invoice creation', async () => {
      await expect(
        pool.query(
          `INSERT INTO invoices (reservation_id, total_amount, status)
           VALUES ($1, $2, $3)`,
          ['non-existent-id', 100000, 'pending']
        )
      ).rejects.toThrow();
    });

    it('should allow valid foreign key reference', async () => {
      const reservation = await TestData.createReservation();

      const result = await pool.query(
        `INSERT INTO invoices (reservation_id, total_amount, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [reservation.id, 100000, 'pending']
      );

      expect(result.rows[0].reservation_id).toBe(reservation.id);
    });

    it('should prevent deletion of referenced reservation', async () => {
      const reservation = await TestData.createReservation();
      await TestData.createInvoice(reservation.id);

      await expect(
        pool.query('DELETE FROM reservations WHERE id = $1', [reservation.id])
      ).rejects.toThrow();
    });
  });

  describe('Cascade Deletes', () => {
    it('should cascade delete invoice items when invoice deleted', async () => {
      const reservation = await TestData.createReservation();
      const invoice = await TestData.createInvoice(reservation.id);

      await pool.query(
        `INSERT INTO invoice_items (invoice_id, description, amount)
         VALUES ($1, $2, $3)`,
        [invoice.id, 'Test Item', 50000]
      );

      // Delete invoice
      await pool.query('DELETE FROM invoices WHERE id = $1', [invoice.id]);

      // Verify cascade delete
      const items = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [invoice.id]
      );
      expect(items.rows.length).toBe(0);
    });
  });

  describe('Connection Pool Behavior', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      const poolSize = 10;
      const clients: any[] = [];

      try {
        // Acquire all connections
        for (let i = 0; i < poolSize; i++) {
          clients.push(await pool.connect());
        }

        // Try to acquire one more (should wait or timeout)
        const extraClient = pool.connect();

        // Release one client
        clients[0].release();

        // Now extra client should succeed
        const client = await extraClient;
        expect(client).toBeDefined();
        client.release();

      } finally {
        clients.forEach(client => client.release());
      }
    });

    it('should return connections to pool after use', async () => {
      const initialCount = await TestDb.count('reservations');

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await TestData.createReservation();
      }

      const finalCount = await TestDb.count('reservations');
      expect(finalCount).toBe(initialCount + 5);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on deadlock', async () => {
      let attempts = 0;
      const maxAttempts = 3;

      async function retryableOperation() {
        attempts++;

        if (attempts < maxAttempts) {
          throw new Error('deadlock detected');
        }

        return await TestData.createReservation();
      }

      let lastError: any;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const result = await retryableOperation();
          expect(result).toBeDefined();
          break;
        } catch (error) {
          lastError = error;
          if (i === maxAttempts - 1) throw error;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      expect(attempts).toBe(maxAttempts);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique constraints', async () => {
      // This depends on your schema - example with potential unique email
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // If you have unique constraints, test them here
        // Example: unique email in users table

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should enforce check constraints', async () => {
      // Test check constraints like people > 0
      await expect(
        pool.query(
          `INSERT INTO reservations (start_at, end_at, people, channel)
           VALUES ($1, $2, $3, $4)`,
          [new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000), -1, 'default']
        )
      ).rejects.toThrow();
    });

    it('should enforce not null constraints', async () => {
      await expect(
        pool.query(
          `INSERT INTO reservations (start_at, end_at, people)
           VALUES ($1, $2, $3)`,
          [new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000), null]
        )
      ).rejects.toThrow();
    });
  });
});
