/**
 * Global Test Setup
 * Runs before all tests
 */
import { beforeAll, afterAll } from 'vitest';
import pool from '../db';

beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Must use test database! Set DATABASE_URL to test database.');
  }
});

afterAll(async () => {
  // Close database pool
  await pool.end();
});
