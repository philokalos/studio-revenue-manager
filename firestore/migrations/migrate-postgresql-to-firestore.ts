/**
 * PostgreSQL to Firestore Migration Script
 *
 * Usage:
 *   npm run migrate
 *
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - FIREBASE_PROJECT_ID: Firebase project ID
 *   - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
 */

import * as admin from 'firebase-admin';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Batch write size
const BATCH_SIZE = 500;

/**
 * Migration Statistics
 */
interface MigrationStats {
  collection: string;
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}

const stats: MigrationStats[] = [];

/**
 * Helper: Convert PostgreSQL timestamp to Firestore Timestamp
 */
function toFirestoreTimestamp(pgDate: Date | string | null): admin.firestore.Timestamp | null {
  if (!pgDate) return null;
  const date = typeof pgDate === 'string' ? new Date(pgDate) : pgDate;
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Migrate Users Table
 */
async function migrateUsers(): Promise<MigrationStats> {
  console.log('📋 Migrating users...');
  const stat: MigrationStats = { collection: 'users', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        const docRef = db.collection('users').doc(row.uid || row.id);
        batch.set(docRef, {
          uid: row.uid || row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          phone: row.phone,
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`User ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Users: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Users migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Reservations Table
 */
async function migrateReservations(): Promise<MigrationStats> {
  console.log('📋 Migrating reservations...');
  const stat: MigrationStats = { collection: 'reservations', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM reservations ORDER BY created_at');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        const docRef = db.collection('reservations').doc(row.id);
        batch.set(docRef, {
          id: row.id,
          googleCalendarEventId: row.google_calendar_event_id,
          startTime: toFirestoreTimestamp(row.start_time),
          endTime: toFirestoreTimestamp(row.end_time),
          initialHeadcount: row.initial_headcount,
          headcountChanges: row.headcount_changes || [],
          channel: row.channel,
          status: row.status,
          notes: row.notes,
          needsCorrection: row.needs_correction,
          correctedAt: toFirestoreTimestamp(row.corrected_at),
          payerName: row.payer_name,
          phone: row.phone,
          peopleCount: row.people_count,
          parkingCount: row.parking_count || 0,
          shootingPurpose: row.shooting_purpose,
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`Reservation ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Reservations: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Reservations migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Invoices Table
 */
async function migrateInvoices(): Promise<MigrationStats> {
  console.log('📋 Migrating invoices...');
  const stat: MigrationStats = { collection: 'invoices', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        // Get discount logs for this invoice
        const discountLogsResult = await pool.query(
          'SELECT * FROM discount_logs WHERE invoice_id = $1 ORDER BY applied_at',
          [row.id]
        );

        const discountLogs = discountLogsResult.rows.map(log => ({
          appliedBy: log.applied_by,
          appliedAt: toFirestoreTimestamp(log.applied_at),
          discountType: log.discount_type,
          discountValue: parseFloat(log.discount_value),
        }));

        const docRef = db.collection('invoices').doc(row.id);
        batch.set(docRef, {
          id: row.id,
          reservationId: row.reservation_id,
          expectedAmount: parseFloat(row.expected_amount),
          discountType: row.discount_type,
          discountValue: row.discount_value ? parseFloat(row.discount_value) : undefined,
          discountAmount: parseFloat(row.discount_amount || 0),
          finalAmount: parseFloat(row.final_amount),
          status: row.status,
          discountLogs: discountLogs,
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`Invoice ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Invoices: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Invoices migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Bank Transactions Table
 */
async function migrateBankTransactions(): Promise<MigrationStats> {
  console.log('📋 Migrating bank transactions...');
  const stat: MigrationStats = { collection: 'bankTransactions', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM bank_transactions ORDER BY transaction_date');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        const docRef = db.collection('bankTransactions').doc(row.id);
        batch.set(docRef, {
          id: row.id,
          transactionDate: toFirestoreTimestamp(row.transaction_date),
          amount: parseFloat(row.amount),
          depositorName: row.depositor_name,
          memo: row.memo,
          transactionType: row.amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL',
          matchedInvoiceId: row.matched_invoice_id,
          status: row.status,
          rawData: row.raw_data || {},
          uploadedBy: 'migration',
          uploadedAt: toFirestoreTimestamp(row.created_at),
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`BankTransaction ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Bank Transactions: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Bank Transactions migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Costs Table
 */
async function migrateCosts(): Promise<MigrationStats> {
  console.log('📋 Migrating costs...');
  const stat: MigrationStats = { collection: 'costs', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM costs ORDER BY month');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        // Convert month DATE to YYYY-MM string
        const monthDate = new Date(row.month);
        const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const docRef = db.collection('costs').doc(monthStr);
        batch.set(docRef, {
          id: monthStr,
          month: monthStr,
          rent: parseFloat(row.rent || 0),
          utilities: parseFloat(row.utilities || 0),
          adsTotal: parseFloat(row.ads_total || 0),
          supplies: parseFloat(row.supplies || 0),
          maintenance: parseFloat(row.maintenance || 0),
          channelBreakdown: row.channel_breakdown || {},
          description: row.description,
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`Cost ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Costs: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Costs migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Goals Table
 */
async function migrateGoals(): Promise<MigrationStats> {
  console.log('📋 Migrating goals...');
  const stat: MigrationStats = { collection: 'goals', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM goals ORDER BY month');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        // Convert month DATE to YYYY-MM string
        const monthDate = new Date(row.month);
        const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const docRef = db.collection('goals').doc(monthStr);
        batch.set(docRef, {
          id: monthStr,
          month: monthStr,
          revenueTarget: parseFloat(row.revenue_target),
          notifiedAt: toFirestoreTimestamp(row.notified_at),
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`Goal ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Goals: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Goals migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Migrate Monthly Summaries Table
 */
async function migrateMonthlySummaries(): Promise<MigrationStats> {
  console.log('📋 Migrating monthly summaries...');
  const stat: MigrationStats = { collection: 'monthlySummaries', total: 0, migrated: 0, failed: 0, errors: [] };

  try {
    const result = await pool.query('SELECT * FROM monthly_summaries ORDER BY month');
    stat.total = result.rows.length;

    let batch = db.batch();
    let batchCount = 0;

    for (const row of result.rows) {
      try {
        // Convert month DATE to YYYY-MM string
        const monthDate = new Date(row.month);
        const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const docRef = db.collection('monthlySummaries').doc(monthStr);
        batch.set(docRef, {
          id: monthStr,
          month: monthStr,
          totalRevenue: parseFloat(row.total_revenue || 0),
          totalCosts: parseFloat(row.total_costs || 0),
          netProfit: parseFloat(row.net_profit || 0),
          utilizationRate: parseFloat(row.utilization_rate || 0),
          goalAchievementRate: parseFloat(row.goal_achievement_rate || 0),
          reservationCount: 0,  // Will be calculated
          averageReservationValue: 0,  // Will be calculated
          lastCalculatedAt: admin.firestore.Timestamp.now(),
          createdAt: toFirestoreTimestamp(row.created_at),
          updatedAt: toFirestoreTimestamp(row.updated_at),
        });

        batchCount++;
        stat.migrated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        stat.failed++;
        stat.errors.push(`MonthlySummary ${row.id}: ${error.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Monthly Summaries: ${stat.migrated}/${stat.total} migrated`);
  } catch (error: any) {
    console.error(`❌ Monthly Summaries migration failed: ${error.message}`);
    stat.errors.push(error.message);
  }

  return stat;
}

/**
 * Main Migration Function
 */
async function migrate() {
  console.log('🚀 Starting PostgreSQL to Firestore migration...\n');

  const startTime = Date.now();

  try {
    // Run migrations sequentially to avoid overwhelming the system
    stats.push(await migrateUsers());
    stats.push(await migrateReservations());
    stats.push(await migrateInvoices());
    stats.push(await migrateBankTransactions());
    stats.push(await migrateCosts());
    stats.push(await migrateGoals());
    stats.push(await migrateMonthlySummaries());

    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('━'.repeat(60));

    let totalMigrated = 0;
    let totalFailed = 0;

    for (const stat of stats) {
      console.log(`${stat.collection.padEnd(20)} ${stat.migrated}/${stat.total} migrated, ${stat.failed} failed`);
      totalMigrated += stat.migrated;
      totalFailed += stat.failed;

      if (stat.errors.length > 0) {
        console.log(`  ⚠️  Errors:`);
        stat.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
        if (stat.errors.length > 5) {
          console.log(`    ... and ${stat.errors.length - 5} more errors`);
        }
      }
    }

    console.log('━'.repeat(60));
    console.log(`Total: ${totalMigrated} migrated, ${totalFailed} failed`);
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log('\n✅ Migration completed!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
