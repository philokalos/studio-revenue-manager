# Database Setup Guide

This directory contains database migrations and utilities for the Studio Revenue Manager backend.

## Quick Start

### 1. Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ with npm

### 2. Environment Setup

Copy the example environment file and configure your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studio_revenue_manager
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Create Database

Connect to PostgreSQL and create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE studio_revenue_manager;
\q
```

### 4. Run Migrations

From the backend package directory:

```bash
npm run db:migrate
```

This will:
- Create a `schema_migrations` tracking table
- Apply all pending migrations in order
- Track applied migrations to prevent re-running

## Database Schema

The initial migration (`001_initial.sql`) creates the following tables:

### Core Tables

#### `reservations`
Stores studio reservations synced from Google Calendar.

**Key Fields:**
- `google_calendar_event_id` - Unique calendar event identifier
- `start_time`, `end_time` - Reservation time range
- `initial_headcount` - Starting number of people
- `headcount_changes` - JSONB tracking changes during reservation
- `channel` - Booking channel (default, hourplace, spacecloud)
- `status` - CONFIRMED or CANCELLED
- `payer_name`, `phone`, `people_count` - Contact and metadata

#### `invoices`
Billing and payment tracking for reservations.

**Key Fields:**
- `reservation_id` - References reservation
- `expected_amount` - Calculated by pricing engine
- `discount_type`, `discount_value` - Discount configuration
- `final_amount` - Amount after discounts
- `status` - OPEN, PAID, PARTIAL, or VOID

#### `discount_logs`
Audit trail for discount applications (replaces Firestore subcollection).

**Key Fields:**
- `invoice_id` - References invoice
- `applied_by` - User who applied discount
- `discount_type`, `discount_value` - Discount details

#### `bank_transactions`
Bank transaction records from CSV uploads.

**Key Fields:**
- `transaction_date`, `amount` - Transaction details
- `depositor_name` - Name on transaction
- `matched_invoice_id` - Links to invoice (nullable)
- `status` - UNMATCHED, MATCHED, or PENDING_REVIEW
- `raw_data` - Original CSV data (JSONB)

### Aggregation Tables

#### `costs`
Monthly operational costs.

**Key Fields:**
- `month` - YYYY-MM-01 format
- `rent`, `utilities`, `ads_total`, `supplies`, `maintenance`
- `channel_breakdown` - Optional JSONB for detailed ad spend

#### `goals`
Monthly revenue targets.

**Key Fields:**
- `month` - YYYY-MM-01 format
- `revenue_target` - Target amount
- `notified_at` - When achievement notification was sent

#### `monthly_summaries`
Cached monthly performance metrics.

**Key Fields:**
- `month` - YYYY-MM-01 format
- `total_revenue`, `total_costs`, `net_profit`
- `utilization_rate` - Reservation rate (0.0-1.0)
- `goal_achievement_rate` - Actual/target ratio

## Indexes

The migration creates optimized indexes for common query patterns:

### Reservations
- `start_time` - For date range queries
- `created_at` - For recent reservations
- `status` - For filtering by status
- `needs_correction` - Partial index for flagged records
- `google_calendar_event_id` - For sync operations

### Invoices
- `reservation_id` - For joining to reservations
- `created_at` - For recent invoices
- `status` - For filtering by payment status

### Bank Transactions
- `transaction_date` - For date range queries
- `matched_invoice_id` - For matching status
- `status` - For filtering unmatched transactions
- Composite: `(status, transaction_date)` - For efficient status filtering with date sorting

### Aggregation Tables
- All have indexes on `month` for efficient monthly queries

## Features

### Automatic Timestamps

All tables include `created_at` and `updated_at` fields. The `updated_at` field is automatically maintained via triggers.

### Data Integrity

The schema enforces:
- Foreign key constraints with appropriate cascade/set null behavior
- Check constraints for valid enums and numeric ranges
- Unique constraints for business keys (calendar event ID, monthly aggregation keys)
- Validation constraints (e.g., end_time > start_time)

### JSONB Fields

Used for flexible, schema-less data:
- `reservations.headcount_changes` - Tracks changes over time
- `bank_transactions.raw_data` - Preserves original CSV data
- `costs.channel_breakdown` - Optional detailed ad spend tracking

## Migration System

### Adding New Migrations

Create a new SQL file in `migrations/` with sequential numbering:

```bash
touch db/migrations/002_add_new_feature.sql
```

Migrations are applied in alphabetical order. The migration runner:
1. Creates `schema_migrations` table if it doesn't exist
2. Checks which migrations have been applied
3. Applies pending migrations in a transaction
4. Records successful migrations
5. Rolls back on any error

### Migration Best Practices

- Use sequential numbering (001, 002, 003...)
- Include descriptive names
- Write idempotent migrations when possible
- Use transactions (automatically handled by runner)
- Add comments for complex changes
- Test rollback procedures

## Troubleshooting

### Migration Fails

If a migration fails:

1. Check the error message for details
2. The migration will be rolled back automatically
3. Fix the SQL in the migration file
4. Re-run `npm run db:migrate`

### Reset Database

To completely reset the database (⚠️ DESTRUCTIVE):

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS studio_revenue_manager;"
psql -U postgres -c "CREATE DATABASE studio_revenue_manager;"

# Re-run migrations
npm run db:migrate
```

### Check Migration Status

To see which migrations have been applied:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

## Production Deployment

For production deployments:

1. Always backup the database before migrations
2. Test migrations in staging environment first
3. Use connection pooling (already configured in `migrate.ts`)
4. Monitor migration execution time
5. Consider read-replica lag during migrations
6. Use transaction-safe migrations

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Migration Best Practices: https://www.postgresql.org/docs/current/ddl-alter.html
- JSONB Performance: https://www.postgresql.org/docs/current/datatype-json.html
