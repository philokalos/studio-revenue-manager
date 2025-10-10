# Database Migration System - Quick Start

## First Time Setup

```bash
# 1. Check current status
npm run db:migrate:status

# 2. Apply all migrations (creates tables)
npm run db:migrate

# 3. Add test data
npm run db:seed

# 4. Verify
npm run db:migrate:status
```

## Test Users (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@studio.com | admin123 | admin |
| staff@studio.com | staff123 | staff |
| viewer@studio.com | viewer123 | viewer |
| manager@studio.com | manager123 | staff |

## Common Commands

```bash
# Check status
npm run db:migrate:status

# Apply migrations
npm run db:migrate

# Preview migrations (dry run)
npm run db:migrate -- --dry-run

# Create backup
npm run db:backup

# Apply seed data
npm run db:seed

# Create new migration
npm run db:create-migration add_feature_name

# Rollback last migration
npm run db:rollback

# Reset database (destructive!)
npm run db:reset
```

## Creating a New Migration

```bash
# 1. Generate migration file
npm run db:create-migration add_user_preferences

# 2. Edit the file: src/db/migrations/XXX_add_user_preferences.sql

# 3. Preview changes
npm run db:migrate -- --dry-run

# 4. Apply migration
npm run db:migrate
```

## Getting Help

```bash
# Show help for any command
npm run db:migrate -- --help
npm run db:rollback -- --help
npm run db:seed -- --help
npm run db:reset -- --help
```

## Documentation

- **MIGRATIONS.md** - Complete guide (recommended)
- **DATABASE_SCRIPTS_SUMMARY.md** - System overview
- **DB_MIGRATION_CHECKLIST.md** - Verification checklist

## Emergency Recovery

```bash
# 1. Create backup first
npm run db:backup

# 2. If something breaks, restore from backup
gunzip -c backups/studio_revenue_manager_TIMESTAMP.sql.gz | psql "$DATABASE_URL"
```

## Production Safety

- All destructive operations require confirmation
- Use `--yes` flag to skip confirmations (automation only)
- Always backup before major changes
- Test in development first

---

For detailed documentation, see **MIGRATIONS.md**
