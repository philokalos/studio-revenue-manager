# Database Migration Guide

Complete guide for managing database migrations in Studio Revenue Manager.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Migration Commands](#migration-commands)
- [Creating Migrations](#creating-migrations)
- [Migration Best Practices](#migration-best-practices)
- [Rollback Strategies](#rollback-strategies)
- [Seed Data Management](#seed-data-management)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses a custom migration system with the following features:

- **Migration Tracking**: All applied migrations are tracked in `migrations_history` table
- **Transaction Safety**: Each migration runs in a transaction for safety
- **Checksum Verification**: Detects if migration files have been modified
- **Dry Run Mode**: Preview migrations before applying
- **Rollback Support**: Mark migrations as rolled back
- **Seed Data**: Idempotent seed data for development
- **Automated Backups**: Built-in backup and retention system

## Quick Start

```bash
# 1. Check current migration status
npm run db:migrate:status

# 2. Apply pending migrations
npm run db:migrate

# 3. Apply seed data (development)
npm run db:seed

# 4. Create a backup
npm run db:backup
```

## Migration Commands

### `npm run db:migrate`

Run all pending migrations.

```bash
# Apply all pending migrations
npm run db:migrate

# Preview without applying (dry run)
npm run db:migrate -- --dry-run

# Force re-apply migrations
npm run db:migrate -- --force

# Migrate up to specific version
npm run db:migrate -- --target=003
```

**Options:**
- `--dry-run, -d`: Preview migrations without applying
- `--force, -f`: Re-apply already applied migrations
- `--target=VERSION`: Migrate up to specific version

### `npm run db:migrate:status`

Show current database migration status.

```bash
npm run db:migrate:status
```

**Output includes:**
- Applied migrations with timestamps
- Pending migrations
- Modified migrations (checksum mismatch)
- Database table statistics
- Total database size

### `npm run db:rollback`

Rollback applied migrations.

```bash
# Rollback last migration
npm run db:rollback

# Rollback last 2 migrations
npm run db:rollback -- --steps=2

# Rollback to specific version (exclusive)
npm run db:rollback -- --to=003

# Skip confirmation
npm run db:rollback -- --yes
```

**Options:**
- `--steps=N`: Rollback N migrations
- `--to=VERSION`: Rollback to specific version (exclusive)
- `--yes, -y`: Skip confirmation prompt

**Important:** Rollback only marks migrations as rolled back. You must manually undo schema changes or restore from backup.

### `npm run db:reset`

Complete database reset (destructive).

```bash
# Reset with confirmation
npm run db:reset

# Reset without confirmation
npm run db:reset -- --yes

# Reset without seed data
npm run db:reset -- --no-seed
```

**Options:**
- `--yes, -y`: Skip confirmation prompts
- `--no-seed`: Skip applying seed data

**Workflow:**
1. Drop all tables (CASCADE)
2. Drop all functions
3. Run all migrations
4. Apply seed data (optional)

### `npm run db:seed`

Apply seed data to database.

```bash
# Apply all seeds
npm run db:seed

# Apply specific seed
npm run db:seed -- --file=users

# Force seed in production
npm run db:seed -- --force
```

**Options:**
- `--force, -f`: Skip production environment check
- `--file=PATTERN`: Apply only seeds matching pattern

### `npm run db:create-migration`

Generate new migration file.

```bash
# Create migration with name
npm run db:create-migration add_user_preferences

# Create migration with spaces (converted to underscores)
npm run db:create-migration "add payment methods table"
```

### `npm run db:backup`

Create database backup.

```bash
# Standard backup (7 day retention)
npm run db:backup

# Custom retention period
bash scripts/backup-db.sh --retention 30

# Skip automatic cleanup
bash scripts/backup-db.sh --no-cleanup
```

## Creating Migrations

### Step 1: Generate Migration File

```bash
npm run db:create-migration add_user_preferences
```

This creates a file like `006_add_user_preferences.sql` in `src/db/migrations/`.

### Step 2: Edit Migration File

```sql
-- Migration: 006_add_user_preferences.sql
-- Description: Add user preferences table
-- Created: 2025-10-10

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme preference: light or dark';
```

### Step 3: Preview Migration

```bash
npm run db:migrate -- --dry-run
```

### Step 4: Apply Migration

```bash
npm run db:migrate
```

### Step 5: Verify

```bash
npm run db:migrate:status
```

## Migration Best Practices

### 1. Naming Conventions

**Good names:**
- `add_user_preferences`
- `create_payment_methods_table`
- `update_reservations_add_status`
- `drop_deprecated_columns`

**Bad names:**
- `migration1`
- `fix`
- `update_table`

### 2. Use IF EXISTS/IF NOT EXISTS

Always use conditional checks:

```sql
-- Good
CREATE TABLE IF NOT EXISTS users (...);
DROP TABLE IF EXISTS old_table CASCADE;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- Bad
CREATE TABLE users (...);
DROP TABLE old_table;
CREATE INDEX idx_name ON table(column);
```

### 3. Include Comments

Document your schema:

```sql
COMMENT ON TABLE users IS 'User authentication and authorization';
COMMENT ON COLUMN users.role IS 'User role: admin, staff, or viewer';
```

### 4. Use Constraints

Enforce data integrity:

```sql
-- Check constraints
CHECK (role IN ('admin', 'staff', 'viewer'))
CHECK (price > 0)

-- Foreign keys with cascade
REFERENCES users(id) ON DELETE CASCADE

-- Unique constraints
CONSTRAINT unique_email UNIQUE (email)
```

### 5. Create Indexes

Optimize common queries:

```sql
-- Single column index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Multi-column index
CREATE INDEX IF NOT EXISTS idx_reservations_date_studio
  ON reservations(reservation_date, studio_id);

-- Partial index
CREATE INDEX IF NOT EXISTS idx_active_reservations
  ON reservations(reservation_date)
  WHERE status = 'confirmed';
```

### 6. Add Triggers for updated_at

Automatically update timestamps:

```sql
CREATE TRIGGER update_tablename_updated_at
  BEFORE UPDATE ON tablename
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 7. Migration Order

Maintain proper dependency order:

1. Create tables without foreign keys
2. Add foreign key constraints
3. Create indexes
4. Add triggers
5. Insert seed data (if needed)

### 8. Idempotent Migrations

Migrations should be safe to re-run:

```sql
-- Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS users (...);

-- Use ON CONFLICT for inserts
INSERT INTO settings (key, value)
VALUES ('feature_flag', 'true')
ON CONFLICT (key) DO NOTHING;

-- Check before dropping
DROP TABLE IF EXISTS old_table CASCADE;
```

## Rollback Strategies

### Strategy 1: Mark as Rolled Back (Current)

The current `npm run db:rollback` only marks migrations as rolled back in the database. You must manually undo schema changes.

**When to use:**
- Quick rollback tracking
- Schema changes are simple
- You have backups

**How to undo:**

1. Restore from backup:
```bash
gunzip -c backups/studio_revenue_manager_20251010_120000.sql.gz | psql "$DATABASE_URL"
```

2. Or manually revert:
```sql
-- If migration added a table
DROP TABLE IF EXISTS new_table CASCADE;

-- If migration added a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- If migration modified data
UPDATE users SET role = 'viewer' WHERE role = 'new_role';
```

### Strategy 2: Down Migrations (Future Enhancement)

Create reversible migrations:

```sql
-- UP MIGRATION
CREATE TABLE user_preferences (...);

-- DOWN MIGRATION (commented out)
-- DROP TABLE IF EXISTS user_preferences CASCADE;
```

### Strategy 3: Backup Before Rollback

Always create a backup before rolling back:

```bash
# 1. Create backup
npm run db:backup

# 2. Rollback
npm run db:rollback

# 3. If needed, restore
gunzip -c backups/latest.sql.gz | psql "$DATABASE_URL"
```

## Seed Data Management

### Seed File Structure

Seed files are in `src/db/seeds/` with naming convention `NNN_description.sql`:

```
seeds/
  001_users.sql          # Test users
  002_test_reservations.sql   # Sample reservations
  003_test_invoices.sql      # Sample invoices
```

### Creating Seed Files

Seed files should be idempotent (can run multiple times):

```sql
-- Use ON CONFLICT to prevent duplicates
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@studio.com',
  '$2b$10$...',
  'System Administrator',
  'admin'
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### Environment-Based Seeding

Seeds are environment-aware:

- **Development**: Runs without confirmation
- **Production**: Requires `--force` flag and confirmation

```bash
# Development
NODE_ENV=development npm run db:seed

# Production (requires confirmation)
NODE_ENV=production npm run db:seed -- --force
```

### Test Credentials

After seeding, default test users are created:

| Email | Password | Role |
|-------|----------|------|
| admin@studio.com | admin123 | admin |
| staff@studio.com | staff123 | staff |
| viewer@studio.com | viewer123 | viewer |
| manager@studio.com | manager123 | staff |

⚠️ **Change these passwords in production!**

## Backup and Restore

### Creating Backups

```bash
# Create backup with default retention (7 days)
npm run db:backup

# Custom retention period
bash scripts/backup-db.sh --retention 30

# Skip automatic cleanup
bash scripts/backup-db.sh --no-cleanup
```

**Backup features:**
- Timestamped filenames: `studio_revenue_manager_20251010_120000.sql.gz`
- Gzip compression
- Automatic retention policy
- Automatic cleanup of old backups

### Restoring Backups

```bash
# List available backups
ls -lh backups/

# Restore from backup
gunzip -c backups/studio_revenue_manager_20251010_120000.sql.gz | psql "$DATABASE_URL"

# Or in two steps
gunzip backups/studio_revenue_manager_20251010_120000.sql.gz
psql "$DATABASE_URL" < backups/studio_revenue_manager_20251010_120000.sql
```

### Backup Before Dangerous Operations

Always backup before:
- Rolling back migrations
- Resetting database
- Modifying production data

```bash
# 1. Backup
npm run db:backup

# 2. Perform operation
npm run db:rollback

# 3. Verify
npm run db:migrate:status

# 4. If issues, restore
gunzip -c backups/latest.sql.gz | psql "$DATABASE_URL"
```

## Troubleshooting

### Migration Checksum Mismatch

**Problem:** Migration file has been modified after being applied.

**Solution:**
```bash
# Check status to see which migrations are modified
npm run db:migrate:status

# Re-apply modified migrations
npm run db:migrate -- --force
```

### Migration Failed Mid-Execution

**Problem:** Migration failed, database might be in inconsistent state.

**Solution:**
```bash
# Check status
npm run db:migrate:status

# Check logs for error details
# Fix the migration file

# If migration is marked as failed, it will be retried on next run
npm run db:migrate

# Or force re-apply
npm run db:migrate -- --force
```

### Can't Connect to Database

**Problem:** Database connection fails.

**Solution:**
```bash
# Check DATABASE_URL in .env
echo $DATABASE_URL

# Test connection manually
psql "$DATABASE_URL" -c "SELECT version();"

# Check database is running
pg_isready -h localhost -p 5432
```

### Migration Already Applied

**Problem:** Trying to apply migration that's already applied.

**Solution:**
```bash
# Check status
npm run db:migrate:status

# If you need to re-apply
npm run db:migrate -- --force
```

### Rollback Not Working

**Problem:** Rollback command marks as rolled back but schema still exists.

**Solution:**

This is expected behavior. You must manually undo schema changes:

```bash
# Option 1: Restore from backup
gunzip -c backups/latest.sql.gz | psql "$DATABASE_URL"

# Option 2: Manually drop changes
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS table_name CASCADE;"

# Option 3: Full reset
npm run db:reset
```

### Seed Data Conflicts

**Problem:** Seed data fails due to duplicate key violations.

**Solution:**

Seeds should use `ON CONFLICT` clauses:

```sql
INSERT INTO users (email, ...)
VALUES ('admin@studio.com', ...)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
```

### Production Safety

**Problem:** Accidentally running dangerous commands in production.

**Solution:**

The system has built-in protections:

- `db:seed` requires `--force` flag in production
- `db:reset` requires double confirmation in production
- Always check `NODE_ENV` before operations

```bash
# Always verify environment
echo $NODE_ENV

# Create backup before operations
npm run db:backup
```

## Migration Workflow Example

Complete workflow for adding a new feature:

```bash
# 1. Create migration
npm run db:create-migration add_payment_methods

# 2. Edit migration file (src/db/migrations/006_add_payment_methods.sql)
# Add your schema changes

# 3. Preview migration
npm run db:migrate -- --dry-run

# 4. Create backup
npm run db:backup

# 5. Apply migration
npm run db:migrate

# 6. Verify
npm run db:migrate:status

# 7. Test in application
npm run dev

# 8. If issues, rollback
npm run db:rollback

# 9. If needed, restore from backup
gunzip -c backups/latest.sql.gz | psql "$DATABASE_URL"
```

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Migration Best Practices: https://www.postgresql.org/docs/current/ddl.html
- Schema Design: https://www.postgresql.org/docs/current/ddl-basics.html

## Support

For issues or questions:
1. Check this documentation
2. Review migration logs
3. Check database status: `npm run db:migrate:status`
4. Contact the development team
