-- Migration: 000_migration_tracker.sql
-- Description: Create migration tracking system
-- Purpose: Track which migrations have been applied to the database
-- This migration MUST be run first before any other migrations

-- Create migrations_history table
CREATE TABLE IF NOT EXISTS migrations_history (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64) NOT NULL,
  execution_time INTEGER NOT NULL DEFAULT 0, -- milliseconds

  -- Add metadata fields
  applied_by VARCHAR(100) DEFAULT CURRENT_USER,
  status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'ROLLED_BACK'))
);

-- Create index on version for fast lookups
CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations_history(version);

-- Create index on applied_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations_history(applied_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations_history(status);

-- Add comments for documentation
COMMENT ON TABLE migrations_history IS 'Tracks all database migrations that have been applied';
COMMENT ON COLUMN migrations_history.version IS 'Unique migration version identifier (e.g., 001, 002, 003)';
COMMENT ON COLUMN migrations_history.name IS 'Descriptive name of the migration';
COMMENT ON COLUMN migrations_history.applied_at IS 'Timestamp when migration was applied';
COMMENT ON COLUMN migrations_history.checksum IS 'SHA-256 checksum of migration file content';
COMMENT ON COLUMN migrations_history.execution_time IS 'Migration execution time in milliseconds';
COMMENT ON COLUMN migrations_history.applied_by IS 'Database user who applied the migration';
COMMENT ON COLUMN migrations_history.status IS 'Migration status: SUCCESS, FAILED, or ROLLED_BACK';
