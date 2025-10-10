#!/usr/bin/env node
/**
 * Database Seed Runner
 *
 * CLI tool for applying seed data to the database
 * Features:
 * - Environment-based seeding (development only by default)
 * - Apply all or specific seed files
 * - Transaction wrapping for safety
 * - Idempotent seeds (can run multiple times)
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SEEDS_DIR = path.join(__dirname, 'seeds');

interface SeedFile {
  filename: string;
  filepath: string;
  order: number;
}

/**
 * Get all seed files
 */
function getSeedFiles(): SeedFile[] {
  if (!fs.existsSync(SEEDS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const filepath = path.join(SEEDS_DIR, filename);
    const order = parseInt(filename.split('_')[0]) || 0;

    return {
      filename,
      filepath,
      order
    };
  });
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
 * Apply a single seed file
 */
async function applySeed(seed: SeedFile): Promise<number> {
  const sql = fs.readFileSync(seed.filepath, 'utf-8');
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    console.log(`🌱 Applying seed: ${seed.filename}`);
    await client.query(sql);

    await client.query('COMMIT');
    const executionTime = Date.now() - startTime;

    console.log(`✅ Seed applied successfully (${executionTime}ms)\n`);

    return executionTime;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Seed failed: ${error}\n`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main seed function
 */
async function runSeeds(options: {
  force?: boolean;
  specific?: string;
} = {}) {
  try {
    const env = process.env.NODE_ENV || 'development';

    console.log('\n🌱 Database Seed Runner\n');
    console.log('═'.repeat(80));
    console.log(`\n📦 Environment: ${env}\n`);

    // Safety check for production
    if (env === 'production' && !options.force) {
      console.error('⚠️  WARNING: Seeding in production environment!');
      console.error('   This will overwrite existing data.\n');

      const confirmed = await confirm('Are you absolutely sure? (y/N): ');
      if (!confirmed) {
        console.log('❌ Seeding cancelled\n');
        return;
      }
    }

    // Get all seed files
    const allSeeds = getSeedFiles();

    if (allSeeds.length === 0) {
      console.log('ℹ️  No seed files found in:', SEEDS_DIR);
      console.log('💡 Create seed files in src/db/seeds/\n');
      return;
    }

    // Filter seeds if specific file requested
    let seedsToApply = allSeeds;
    if (options.specific) {
      seedsToApply = allSeeds.filter(s => s.filename.includes(options.specific!));

      if (seedsToApply.length === 0) {
        console.error(`❌ No seed files found matching: ${options.specific}`);
        process.exit(1);
      }
    }

    console.log(`📁 Found ${seedsToApply.length} seed file(s):\n`);
    for (const seed of seedsToApply) {
      console.log(`   ${seed.filename}`);
    }
    console.log('');

    // Apply seeds
    let totalTime = 0;
    for (const seed of seedsToApply) {
      const executionTime = await applySeed(seed);
      totalTime += executionTime;
    }

    console.log('🎉 All seeds applied successfully!');
    console.log(`⏱️  Total execution time: ${totalTime}ms\n`);

    // Show test credentials
    console.log('📝 Test Users Created:\n');
    console.log('   Email                  Password      Role');
    console.log('   ' + '─'.repeat(76));
    console.log('   admin@studio.com       admin123      admin');
    console.log('   staff@studio.com       staff123      staff');
    console.log('   viewer@studio.com      viewer123     viewer');
    console.log('   manager@studio.com     manager123    staff');
    console.log('\n⚠️  Change these passwords in production!\n');

  } catch (error) {
    console.error('\n❌ Seeding process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force') || args.includes('-f'),
  specific: args.find(arg => arg.startsWith('--file='))?.split('=')[1]
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Seed Runner

Usage:
  npm run db:seed [options]

Options:
  --force, -f         Skip production environment check
  --file=PATTERN      Apply only seeds matching pattern
  --help, -h          Show this help message

Examples:
  npm run db:seed                    # Apply all seeds
  npm run db:seed -- --file=users    # Apply only user seeds
  npm run db:seed -- --force         # Force seed in production

Environment:
  NODE_ENV=development  # Default, allows seeding without confirmation
  NODE_ENV=production   # Requires --force flag and confirmation

Seed Files:
  Place seed files in: src/db/seeds/
  Naming convention: NNN_description.sql (e.g., 001_users.sql)
  Files are applied in alphabetical order

Notes:
  - Seeds are idempotent (can run multiple times safely)
  - Use ON CONFLICT clauses to prevent duplicates
  - Seeds are wrapped in transactions for safety
  - Test credentials are shown after successful seeding
`);
  process.exit(0);
}

// Run seeds
runSeeds(options);
