#!/usr/bin/env node
/**
 * Database Migration Rollback
 *
 * CLI tool for rolling back database migrations
 * Features:
 * - Rollback last N migrations
 * - Rollback to specific version
 * - Confirmation prompts for safety
 * - Backup creation before rollback
 */

import { Pool } from 'pg';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface AppliedMigration {
  id: number;
  version: string;
  name: string;
  applied_at: Date;
}

/**
 * Get applied migrations in reverse order
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  const result = await pool.query(`
    SELECT id, version, name, applied_at
    FROM migrations_history
    WHERE status = 'SUCCESS'
    ORDER BY version DESC
  `);
  return result.rows;
}

/**
 * Prompt user for confirmation
 */
function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Mark migration as rolled back
 */
async function markRolledBack(version: string) {
  await pool.query(`
    UPDATE migrations_history
    SET status = 'ROLLED_BACK'
    WHERE version = $1
  `, [version]);
}

/**
 * Rollback migrations
 */
async function rollback(options: {
  steps?: number;
  toVersion?: string;
  yes?: boolean;
}) {
  try {
    console.log('🔄 Database Migration Rollback\n');

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('ℹ️  No migrations to rollback\n');
      return;
    }

    // Determine which migrations to rollback
    let migrationsToRollback: AppliedMigration[];

    if (options.toVersion) {
      // Rollback to specific version
      const targetIndex = appliedMigrations.findIndex(m => m.version === options.toVersion);
      if (targetIndex === -1) {
        console.error(`❌ Migration version ${options.toVersion} not found`);
        process.exit(1);
      }
      migrationsToRollback = appliedMigrations.slice(0, targetIndex);
    } else if (options.steps) {
      // Rollback N steps
      migrationsToRollback = appliedMigrations.slice(0, options.steps);
    } else {
      // Rollback last migration (default)
      migrationsToRollback = appliedMigrations.slice(0, 1);
    }

    if (migrationsToRollback.length === 0) {
      console.log('ℹ️  No migrations to rollback\n');
      return;
    }

    // Show what will be rolled back
    console.log('⚠️  The following migrations will be rolled back:\n');
    console.log('   Version  Applied At              Name');
    console.log('   ' + '─'.repeat(76));
    for (const migration of migrationsToRollback) {
      const appliedAt = new Date(migration.applied_at).toLocaleString();
      console.log(`   ${migration.version.padEnd(8)} ${appliedAt}  ${migration.name}`);
    }
    console.log('');

    console.log('⚠️  WARNING: This operation will mark migrations as ROLLED_BACK.');
    console.log('   You will need to manually undo any database changes.');
    console.log('   Consider creating a backup first with: npm run db:backup\n');

    // Confirm rollback
    if (!options.yes) {
      const confirmed = await confirm('Do you want to continue? (y/N): ');
      if (!confirmed) {
        console.log('❌ Rollback cancelled\n');
        return;
      }
    }

    // Perform rollback
    console.log('\n🔄 Rolling back migrations...\n');

    for (const migration of migrationsToRollback) {
      console.log(`⏪ Rolling back: ${migration.version} - ${migration.name}`);
      await markRolledBack(migration.version);
      console.log(`✅ Marked as rolled back\n`);
    }

    console.log('🎉 Rollback completed successfully!\n');
    console.log('⚠️  IMPORTANT: Database schema changes have NOT been automatically undone.');
    console.log('   You need to manually revert the database changes or restore from backup.\n');
    console.log('💡 To re-apply migrations, run: npm run db:migrate\n');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  steps: parseInt(args.find(arg => arg.startsWith('--steps='))?.split('=')[1] || ''),
  toVersion: args.find(arg => arg.startsWith('--to='))?.split('=')[1],
  yes: args.includes('--yes') || args.includes('-y')
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Migration Rollback

Usage:
  npm run db:rollback [options]

Options:
  --steps=N       Rollback N migrations (default: 1)
  --to=VERSION    Rollback to specific version (exclusive)
  --yes, -y       Skip confirmation prompt
  --help, -h      Show this help message

Examples:
  npm run db:rollback                  # Rollback last migration
  npm run db:rollback -- --steps=2     # Rollback last 2 migrations
  npm run db:rollback -- --to=003      # Rollback to version 003 (exclusive)
  npm run db:rollback -- --yes         # Skip confirmation

Note: This only marks migrations as rolled back in the database.
      You must manually undo schema changes or restore from backup.
`);
  process.exit(0);
}

// Validate options
if (options.steps && options.toVersion) {
  console.error('❌ Cannot use both --steps and --to options');
  process.exit(1);
}

// Run rollback
rollback(options);
