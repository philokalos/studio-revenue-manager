#!/usr/bin/env tsx
/**
 * Database Migration Runner
 *
 * Executes SQL migration files in order.
 * Tracks applied migrations in a migrations table.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'studio_revenue_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

interface Migration {
  name: string;
  path: string;
}

async function ensureMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(query);
  console.log('✓ Schema migrations table ready');
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query(
    'SELECT name FROM schema_migrations ORDER BY applied_at'
  );

  return new Set(result.rows.map(row => row.name));
}

async function getMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(file => ({
    name: file,
    path: join(migrationsDir, file),
  }));
}

async function applyMigration(migration: Migration): Promise<void> {
  const client = await pool.connect();

  try {
    console.log(`\n→ Applying migration: ${migration.name}`);

    await client.query('BEGIN');

    // Read and execute migration SQL
    const sql = readFileSync(migration.path, 'utf-8');
    await client.query(sql);

    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [migration.name]
    );

    await client.query('COMMIT');
    console.log(`✓ Successfully applied: ${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to apply: ${migration.name}`);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...\n');
  console.log(`Database: ${process.env.DB_NAME || 'studio_revenue_manager'}`);
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}\n`);

  try {
    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`\nApplied migrations: ${appliedMigrations.size}`);

    // Get all migration files
    const migrationFiles = await getMigrationFiles();
    console.log(`Total migration files: ${migrationFiles.length}`);

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !appliedMigrations.has(migration.name)
    );

    if (pendingMigrations.length === 0) {
      console.log('\n✓ Database is up to date. No migrations to apply.');
      return;
    }

    console.log(`\nPending migrations: ${pendingMigrations.length}`);

    // Apply pending migrations
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n✓ Migration process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration process failed:', error);
    process.exit(1);
  });
