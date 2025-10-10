#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * CLI tool for running database migrations
 * Features:
 * - Tracks applied migrations in migrations_history table
 * - Transaction wrapping for safety
 * - Dry-run mode for testing
 * - Force mode for re-running migrations
 * - Checksum verification to detect file changes
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface Migration {
  version: string;
  name: string;
  filename: string;
  filepath: string;
  checksum: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  applied_at: Date;
  checksum: string;
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Calculate SHA-256 checksum of file content
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const version = filename.split('_')[0];
    const name = filename.replace(/^\d+_/, '').replace('.sql', '');

    return {
      version,
      name,
      filename,
      filepath,
      checksum: calculateChecksum(content)
    };
  });
}

/**
 * Get migrations that have already been applied
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  try {
    const result = await pool.query(`
      SELECT version, name, applied_at, checksum
      FROM migrations_history
      WHERE status = 'SUCCESS'
      ORDER BY version
    `);
    return result.rows;
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

/**
 * Ensure migrations_history table exists
 */
async function ensureMigrationTable() {
  const trackerPath = path.join(MIGRATIONS_DIR, '000_migration_tracker.sql');

  // Check if migrations_history table exists
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'migrations_history'
    );
  `);

  if (!tableCheck.rows[0].exists) {
    console.log('📝 Creating migrations_history table...');
    const sql = fs.readFileSync(trackerPath, 'utf-8');
    await pool.query(sql);
    console.log('✅ migrations_history table created');
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(migration: Migration, dryRun: boolean = false): Promise<number> {
  const sql = fs.readFileSync(migration.filepath, 'utf-8');
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would apply migration: ${migration.filename}`);
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
    } else {
      console.log(`⚡ Applying migration: ${migration.filename}`);
      await client.query(sql);

      // Record migration in history (skip for 000_migration_tracker itself)
      if (migration.version !== '000') {
        await client.query(`
          INSERT INTO migrations_history (version, name, checksum, execution_time, status)
          VALUES ($1, $2, $3, $4, 'SUCCESS')
          ON CONFLICT (version) DO UPDATE
          SET checksum = EXCLUDED.checksum,
              execution_time = EXCLUDED.execution_time,
              applied_at = CURRENT_TIMESTAMP
        `, [migration.version, migration.name, migration.checksum, 0]);
      }
    }

    await client.query('COMMIT');
    const executionTime = Date.now() - startTime;

    // Update execution time
    if (!dryRun && migration.version !== '000') {
      await pool.query(`
        UPDATE migrations_history
        SET execution_time = $1
        WHERE version = $2
      `, [executionTime, migration.version]);
    }

    if (!dryRun) {
      console.log(`✅ Migration applied successfully (${executionTime}ms)`);
    }

    return executionTime;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${error}`);

    // Record failure in history
    if (!dryRun && migration.version !== '000') {
      try {
        await pool.query(`
          INSERT INTO migrations_history (version, name, checksum, status)
          VALUES ($1, $2, $3, 'FAILED')
          ON CONFLICT (version) DO UPDATE
          SET status = 'FAILED',
              applied_at = CURRENT_TIMESTAMP
        `, [migration.version, migration.name, migration.checksum]);
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main migration function
 */
async function runMigrations(options: {
  dryRun?: boolean;
  force?: boolean;
  target?: string;
} = {}) {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Get all migrations
    const allMigrations = getMigrationFiles();
    console.log(`📁 Found ${allMigrations.length} migration files\n`);

    // Ensure migration tracking table exists
    await ensureMigrationTable();

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    console.log(`📊 ${appliedMigrations.length} migrations already applied\n`);

    // Determine which migrations to run
    let migrationsToRun = allMigrations.filter(m => {
      // Skip if already applied (unless force mode)
      if (appliedVersions.has(m.version) && !options.force) {
        return false;
      }

      // Skip if beyond target
      if (options.target && m.version > options.target) {
        return false;
      }

      return true;
    });

    // Always skip 000_migration_tracker if it's already applied
    migrationsToRun = migrationsToRun.filter(m =>
      m.version !== '000' || !appliedVersions.has('000')
    );

    if (migrationsToRun.length === 0) {
      console.log('✨ No pending migrations to apply\n');
      return;
    }

    console.log(`📝 Migrations to apply: ${migrationsToRun.length}\n`);

    // Verify checksums for already-applied migrations
    if (!options.force) {
      for (const applied of appliedMigrations) {
        const migration = allMigrations.find(m => m.version === applied.version);
        if (migration && migration.checksum !== applied.checksum) {
          console.warn(`⚠️  Warning: Migration ${migration.version} has been modified since it was applied!`);
          console.warn(`   Original checksum: ${applied.checksum}`);
          console.warn(`   Current checksum:  ${migration.checksum}`);
          console.warn(`   Use --force to re-apply\n`);
        }
      }
    }

    // Apply migrations
    let totalTime = 0;
    for (const migration of migrationsToRun) {
      const executionTime = await applyMigration(migration, options.dryRun);
      totalTime += executionTime;
      console.log('');
    }

    if (!options.dryRun) {
      console.log(`🎉 All migrations completed successfully!`);
      console.log(`⏱️  Total execution time: ${totalTime}ms\n`);
    } else {
      console.log(`🔍 Dry run completed. No changes were made to the database.\n`);
    }

  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  force: args.includes('--force') || args.includes('-f'),
  target: args.find(arg => arg.startsWith('--target='))?.split('=')[1]
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Migration Runner

Usage:
  npm run db:migrate [options]

Options:
  --dry-run, -d     Show what would be migrated without making changes
  --force, -f       Re-apply already applied migrations
  --target=VERSION  Migrate up to specific version (e.g., --target=003)
  --help, -h        Show this help message

Examples:
  npm run db:migrate              # Apply all pending migrations
  npm run db:migrate -- --dry-run # Preview migrations
  npm run db:migrate -- --force   # Re-apply all migrations
  npm run db:migrate -- --target=003  # Migrate up to version 003
`);
  process.exit(0);
}

// Run migrations
runMigrations(options);
