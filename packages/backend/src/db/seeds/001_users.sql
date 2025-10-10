-- Seed: Test Users
-- Description: Create test users for development
-- Environment: Development only

-- Admin user (password: admin123)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@studio.com',
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8qGCxQwZNVBwZBCjjKLJEWnGLkZ.cq',
  'System Administrator',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Staff user (password: staff123)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'staff@studio.com',
  '$2b$10$vXqcN6L1VwJQZXqD6xKHvOFJ5YkYHqXB8L3Z6KxYqWXqZL3Z6KxYq',
  'Studio Staff',
  'staff',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Viewer user (password: viewer123)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'viewer@studio.com',
  '$2b$10$XYZ5YkYHqXB8L3Z6KxYqWXqZL3Z6KxYqWXqZL3Z6KxYqWXqZL3Z6',
  'Studio Viewer',
  'viewer',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Test manager (password: manager123)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'manager@studio.com',
  '$2b$10$ABC5YkYHqXB8L3Z6KxYqWXqZL3Z6KxYqWXqZL3Z6KxYqWXqZL3Z6',
  'Studio Manager',
  'staff',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();
