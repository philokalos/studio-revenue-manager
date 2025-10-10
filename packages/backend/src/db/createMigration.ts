#!/usr/bin/env node
/**
 * Migration Generator
 *
 * CLI tool to create new migration files with:
 * - Auto-generated version number (timestamp-based)
 * - Template with up/down sections
 * - Naming conventions
 */

import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Generate next migration version number
 */
function getNextVersion(): string {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    return '001';
  }

  const lastFile = files[files.length - 1];
  const lastVersion = parseInt(lastFile.split('_')[0]);

  if (isNaN(lastVersion)) {
    // Use timestamp-based versioning
    return new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  }

  // Use sequential versioning
  return (lastVersion + 1).toString().padStart(3, '0');
}

/**
 * Generate migration template
 */
function generateTemplate(name: string, version: string): string {
  const timestamp = new Date().toISOString().split('T')[0];

  return `-- Migration: ${version}_${name}.sql
-- Description: ${name.replace(/_/g, ' ')}
-- Created: ${timestamp}
--
-- This migration adds/modifies database schema

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Add your schema changes here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX IF NOT EXISTS idx_example_name ON example_table(name);

-- COMMENT ON TABLE example_table IS 'Description of the table';


-- ============================================================================
-- DOWN MIGRATION (Optional - for rollback support)
-- ============================================================================

-- Add rollback logic here (commented out by default)
-- Uncomment if you implement down migrations

-- DROP TABLE IF EXISTS example_table CASCADE;
`;
}

/**
 * Create new migration file
 */
function createMigration(name: string) {
  try {
    // Validate name
    if (!name) {
      console.error('❌ Error: Migration name is required');
      console.log('\nUsage: npm run db:create-migration <name>');
      console.log('Example: npm run db:create-migration add_user_preferences\n');
      process.exit(1);
    }

    // Sanitize name (replace spaces with underscores, lowercase)
    const sanitizedName = name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Generate version
    const version = getNextVersion();
    const filename = `${version}_${sanitizedName}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.error(`❌ Error: Migration file already exists: ${filename}`);
      process.exit(1);
    }

    // Generate template
    const template = generateTemplate(sanitizedName, version);

    // Create file
    fs.writeFileSync(filepath, template);

    console.log('\n✅ Migration created successfully!\n');
    console.log(`📄 File: ${filename}`);
    console.log(`📁 Path: ${filepath}`);
    console.log(`🔢 Version: ${version}\n`);
    console.log('📝 Next steps:');
    console.log('   1. Edit the migration file to add your schema changes');
    console.log('   2. Run: npm run db:migrate -- --dry-run  (to preview)');
    console.log('   3. Run: npm run db:migrate  (to apply)\n');

  } catch (error) {
    console.error('❌ Error creating migration:', error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
Migration Generator

Usage:
  npm run db:create-migration <name>

Arguments:
  name            Descriptive name for the migration (required)
                  Use snake_case or spaces (will be converted)

Options:
  --help, -h      Show this help message

Examples:
  npm run db:create-migration add_user_preferences
  npm run db:create-migration "add payment methods table"
  npm run db:create-migration update_reservations_schema

Naming Conventions:
  - Use descriptive names that explain what the migration does
  - Prefix with action: add_, create_, update_, drop_, alter_
  - Use snake_case or spaces (spaces will be converted to underscores)
  - Keep names concise but clear

  Good examples:
    add_user_preferences
    create_payment_methods_table
    update_reservations_add_status
    drop_deprecated_columns

  Bad examples:
    migration1
    fix
    update_table
`);
  process.exit(0);
}

// Create migration
const name = args.join(' ');
createMigration(name);
