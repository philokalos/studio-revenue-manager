-- Migration: Add users table for authentication
-- Track 1: Authentication System
-- Date: 2025-10-10

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'staff', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash for 'admin123' generated with bcrypt, 10 rounds
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@studio.com',
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8qGCxQwZNVBwZBCjjKLJEWnGLkZ.cq',
  'System Administrator',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE users IS 'User authentication and authorization table';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique, used for login)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.name IS 'User display name';
COMMENT ON COLUMN users.role IS 'User role: admin (full access), staff (operations), viewer (read-only)';
