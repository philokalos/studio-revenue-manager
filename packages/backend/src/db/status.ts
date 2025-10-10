#!/usr/bin/env node
/**
 * Database Migration Status
 *
 * Shows current database migration status including:
 * - Applied migrations
 * - Pending migrations
 * - Database connection info
 * - Table statistics
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

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function showStatus() {
  try {
    console.log('\n📊 Database Migration Status\n');
    console.log('═'.repeat(80));

    // Database connection info
    const dbUrl = process.env.DATABASE_URL || '';
    const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'unknown';
    console.log(`\n🗄️  Database: ${dbName}`);
    console.log(`🔗 Connection: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'migrations_history'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  migrations_history table does not exist');
      console.log('💡 Run: npm run db:migrate\n');
      return;
    }

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(filename => {
        const filepath = path.join(MIGRATIONS_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf-8');
        const version = filename.split('_')[0];
        const name = filename.replace(/^\d+_/, '').replace('.sql', '');

        return {
          version,
          name,
          filename,
          checksum: calculateChecksum(content)
        };
      });

    // Get applied migrations
    const appliedResult = await pool.query(`
      SELECT
        version,
        name,
        applied_at,
        checksum,
        execution_time,
        status
      FROM migrations_history
      ORDER BY version
    `);
    const appliedMigrations = appliedResult.rows;
    const appliedVersions = new Set(appliedMigrations.map((m: any) => m.version));

    // Categorize migrations
    const pending = migrationFiles.filter(m => !appliedVersions.has(m.version));
    const applied = migrationFiles.filter(m => appliedVersions.has(m.version));
    const modified = applied.filter(m => {
      const record = appliedMigrations.find((a: any) => a.version === m.version);
      return record && record.checksum !== m.checksum;
    });

    // Applied migrations
    console.log('✅ Applied Migrations:\n');
    if (applied.length === 0) {
      console.log('   (none)');
    } else {
      console.log('   Version  Status      Time     Applied At              Name');
      console.log('   ' + '─'.repeat(76));
      for (const migration of applied) {
        const record = appliedMigrations.find((a: any) => a.version === migration.version);
        if (record) {
          const status = record.status === 'SUCCESS' ? '✓' : '✗';
          const time = record.execution_time ? `${record.execution_time}ms`.padEnd(8) : '-'.padEnd(8);
          const appliedAt = new Date(record.applied_at).toLocaleString();
          const isModified = record.checksum !== migration.checksum ? ' ⚠️ ' : '';

          console.log(`   ${migration.version.padEnd(8)} ${status.padEnd(11)} ${time} ${appliedAt}  ${migration.name}${isModified}`);
        }
      }
    }

    // Pending migrations
    console.log(`\n⏳ Pending Migrations:\n`);
    if (pending.length === 0) {
      console.log('   (none)');
    } else {
      console.log('   Version  Name');
      console.log('   ' + '─'.repeat(76));
      for (const migration of pending) {
        console.log(`   ${migration.version.padEnd(8)} ${migration.name}`);
      }
    }

    // Modified migrations warning
    if (modified.length > 0) {
      console.log(`\n⚠️  Modified Migrations (checksums don't match):\n`);
      console.log('   Version  Name');
      console.log('   ' + '─'.repeat(76));
      for (const migration of modified) {
        console.log(`   ${migration.version.padEnd(8)} ${migration.name}`);
      }
      console.log('\n   These migrations have been changed since they were applied.');
      console.log('   Use --force to re-apply them.\n');
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log(`📈 Summary: ${applied.length} applied, ${pending.length} pending, ${modified.length} modified\n`);

    // Table statistics
    console.log('📊 Database Tables:\n');
    const tablesResult = await pool.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('   (no tables)');
    } else {
      console.log('   Table Name                              Size');
      console.log('   ' + '─'.repeat(76));
      for (const table of tablesResult.rows) {
        console.log(`   ${table.tablename.padEnd(40)} ${table.size}`);
      }
    }

    // Database size
    const sizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS size;
    `);
    console.log(`\n💾 Total Database Size: ${sizeResult.rows[0].size}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

showStatus();
