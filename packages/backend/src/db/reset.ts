#!/usr/bin/env node
/**
 * Database Reset Script
 *
 * Completely resets the database by:
 * 1. Dropping all tables
 * 2. Re-running all migrations
 * 3. Applying seed data
 *
 * ⚠️  WARNING: This is a destructive operation!
 */

import { Pool } from 'pg';
import * as readline from 'readline';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
 * Drop all tables in the database
 */
async function dropAllTables() {
  console.log('🗑️  Dropping all tables...\n');

  // Get all tables
  const result = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  const tables = result.rows.map(r => r.tablename);

  if (tables.length === 0) {
    console.log('   No tables to drop\n');
    return;
  }

  console.log(`   Found ${tables.length} tables to drop:`);
  for (const table of tables) {
    console.log(`   - ${table}`);
  }
  console.log('');

  // Drop all tables with CASCADE
  for (const table of tables) {
    try {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   ✅ Dropped: ${table}`);
    } catch (error) {
      console.error(`   ❌ Failed to drop ${table}:`, error);
      throw error;
    }
  }

  console.log('\n✅ All tables dropped successfully\n');
}

/**
 * Drop all functions
 */
async function dropAllFunctions() {
  console.log('🔧 Dropping all functions...\n');

  const result = await pool.query(`
    SELECT proname, prokind
    FROM pg_proc
    INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
    AND prokind IN ('f', 'p');
  `);

  if (result.rows.length === 0) {
    console.log('   No functions to drop\n');
    return;
  }

  for (const row of result.rows) {
    try {
      await pool.query(`DROP FUNCTION IF EXISTS ${row.proname} CASCADE`);
      console.log(`   ✅ Dropped: ${row.proname}`);
    } catch (error) {
      console.error(`   ⚠️  Could not drop ${row.proname}`);
    }
  }

  console.log('');
}

/**
 * Run migrations
 */
function runMigrations() {
  console.log('🚀 Running migrations...\n');
  try {
    execSync('tsx src/db/migrate.ts', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Migration failed');
    throw error;
  }
}

/**
 * Apply seed data
 */
function applySeedData(skipSeeds: boolean) {
  if (skipSeeds) {
    console.log('⏭️  Skipping seed data\n');
    return;
  }

  console.log('🌱 Applying seed data...\n');
  try {
    execSync('tsx src/db/seed.ts -- --force', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Seeding failed');
    throw error;
  }
}

/**
 * Main reset function
 */
async function resetDatabase(options: {
  yes?: boolean;
  skipSeeds?: boolean;
}) {
  try {
    const env = process.env.NODE_ENV || 'development';

    console.log('\n🔄 Database Reset\n');
    console.log('═'.repeat(80));
    console.log(`\n📦 Environment: ${env}`);

    const dbUrl = process.env.DATABASE_URL || '';
    const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'unknown';
    console.log(`🗄️  Database: ${dbName}\n`);

    // Safety warnings
    console.log('⚠️  WARNING: This will completely reset the database!');
    console.log('   - All tables will be dropped');
    console.log('   - All data will be lost');
    console.log('   - Migrations will be re-run');
    if (!options.skipSeeds) {
      console.log('   - Seed data will be applied');
    }
    console.log('');

    if (env === 'production') {
      console.error('🚨 PRODUCTION ENVIRONMENT DETECTED!');
      console.error('   Resetting a production database is extremely dangerous.\n');
    }

    // Confirm reset
    if (!options.yes) {
      const confirmed = await confirm('Are you absolutely sure you want to continue? (y/N): ');
      if (!confirmed) {
        console.log('\n❌ Reset cancelled\n');
        return;
      }

      // Double confirmation for production
      if (env === 'production') {
        console.log('');
        const doubleConfirmed = await confirm('Type "RESET PRODUCTION" to confirm: ');
        if (doubleConfirmed !== true) {
          console.log('\n❌ Reset cancelled (confirmation failed)\n');
          return;
        }
      }
    }

    console.log('\n🔄 Starting reset process...\n');
    console.log('═'.repeat(80));
    console.log('');

    // Drop all tables and functions
    await dropAllTables();
    await dropAllFunctions();

    // Close pool before running child processes
    await pool.end();

    // Run migrations
    runMigrations();

    // Apply seed data
    applySeedData(options.skipSeeds || false);

    console.log('═'.repeat(80));
    console.log('\n🎉 Database reset completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Reset process failed:', error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  yes: args.includes('--yes') || args.includes('-y'),
  skipSeeds: args.includes('--no-seed')
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Reset

Usage:
  npm run db:reset [options]

Options:
  --yes, -y       Skip confirmation prompts
  --no-seed       Skip applying seed data after reset
  --help, -h      Show this help message

Examples:
  npm run db:reset                 # Reset with confirmation
  npm run db:reset -- --yes        # Reset without confirmation
  npm run db:reset -- --no-seed    # Reset without seed data

⚠️  WARNING: This is a destructive operation!
    - All tables will be dropped
    - All data will be lost
    - Migrations will be re-run from scratch
    - Seed data will be applied (unless --no-seed)

Environment:
  NODE_ENV=development  # Default
  NODE_ENV=production   # Requires additional confirmation

Workflow:
  1. Drop all tables (CASCADE)
  2. Drop all functions
  3. Run all migrations
  4. Apply seed data (optional)

Alternative:
  For less destructive updates, consider:
  - npm run db:migrate      # Apply pending migrations
  - npm run db:seed         # Re-apply seed data
  - npm run db:rollback     # Rollback specific migrations
`);
  process.exit(0);
}

// Run reset
resetDatabase(options);
