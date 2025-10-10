# Track 1: Authentication System Implementation

**Developer**: Developer A
**Duration**: 2-3 days
**Priority**: 🚨 Urgent & Important
**Blocker**: Production deployment

## Objective

Implement production-ready authentication system to replace hard-coded 'system' user in invoice.ts:114 and protect all mutation endpoints.

## Current State Analysis

### Critical Issue
**File**: `packages/backend/src/routes/invoice.ts:114`
```typescript
// 할인 로그 기록 (할인이 적용된 경우)
if (quote.appliedDiscount) {
  await client.query(
    `INSERT INTO discount_logs (
      invoice_id,
      applied_by,
      discount_type,
      discount_value
    ) VALUES ($1, $2, $3, $4)`,
    [
      invoiceId,
      'system', // ⚠️ TODO: 실제 사용자 정보로 대체
      quote.appliedDiscount.type,
      quote.appliedDiscount.value
    ]
  );
}
```

**Impact**:
- Audit trail compromised (all actions attributed to 'system')
- Production deployment blocked
- Cannot track who applied discounts, created invoices, or modified data

## Implementation Plan

### Step 1: Choose Authentication Strategy (30 min)

**Recommended**: JWT (JSON Web Tokens)

**Rationale**:
- Stateless authentication (scales horizontally)
- Native Express middleware support
- Mobile app ready (store token in secure storage)
- Google Calendar API compatible

**Alternative considered**: Session-based auth
- Requires Redis/session store (additional infrastructure)
- Not ideal for API-first architecture
- Better for server-rendered apps

### Step 2: Create Type Definitions (1 hour)

**Create**: `packages/backend/src/types/auth.ts`

```typescript
// packages/backend/src/types/auth.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: User['role'];
  iat: number;  // issued at
  exp: number;  // expiration
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
  expiresIn: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

### Step 3: Install Dependencies (10 min)

```bash
cd packages/backend
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

### Step 4: Create Authentication Middleware (2 hours)

**Create**: `packages/backend/src/middleware/auth.ts`

```typescript
// packages/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, User } from '../types/auth';
import pool from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export const generateToken = (user: User): string => {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;

    // Fetch full user from database
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      role: result.rows[0].role,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional: Role-based authorization middleware
export const requireRole = (...allowedRoles: User['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Requires one of roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};
```

### Step 5: Create Authentication Routes (2 hours)

**Create**: `packages/backend/src/routes/auth.ts`

```typescript
// packages/backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { LoginRequest, LoginResponse } from '../types/auth';
import { generateToken } from '../middleware/auth';
import pool from '../db';

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name required' });
      return;
    }

    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`,
      [email, passwordHash, name, 'staff'] // Default role
    );

    const user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      role: result.rows[0].role,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    const token = generateToken(user);

    const response: LoginResponse = {
      user,
      token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Fetch user
    const result = await pool.query(
      `SELECT id, email, password_hash, name, role, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const userData = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, userData.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    const token = generateToken(user);

    const response: LoginResponse = {
      user,
      token,
      expiresIn: 7 * 24 * 60 * 60,
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

export default router;
```

### Step 6: Database Migration (1 hour)

**Create**: `packages/backend/src/db/migrations/003_add_users_table.sql`

```sql
-- Add users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'staff', 'viewer'))
);

-- Index for login performance
CREATE INDEX idx_users_email ON users(email);

-- Update discount_logs to reference users
ALTER TABLE discount_logs
  DROP CONSTRAINT IF EXISTS fk_applied_by_users,
  ADD COLUMN IF NOT EXISTS applied_by_user_id UUID,
  ADD CONSTRAINT fk_applied_by_users
    FOREIGN KEY (applied_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;

-- Migrate existing 'system' entries (optional - can be null)
-- UPDATE discount_logs SET applied_by_user_id = NULL WHERE applied_by = 'system';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

Run migration:
```bash
cd packages/backend
npm run db:migrate
```

### Step 7: Update invoice.ts (30 min)

**Modify**: `packages/backend/src/routes/invoice.ts`

```typescript
// Change line 114 from:
'system', // TODO: 실제 사용자 정보로 대체

// To:
req.user?.id || null, // Authenticated user ID

// Also add authenticateToken middleware to route:
import { authenticateToken } from '../middleware/auth';

// Protect the POST route:
router.post('/invoices', authenticateToken, async (req, res) => {
  // ... existing code
});
```

### Step 8: Protect All Mutation Routes (2 hours)

Add `authenticateToken` middleware to:

**packages/backend/src/routes/quote.ts**:
```typescript
router.post('/quotes', authenticateToken, calculateQuote);
```

**packages/backend/src/routes/reservation.ts**:
```typescript
router.post('/reservations', authenticateToken, createReservation);
router.put('/reservations/:id', authenticateToken, updateReservation);
router.delete('/reservations/:id', authenticateToken, deleteReservation);
```

**packages/backend/src/routes/invoice.ts**:
```typescript
router.post('/invoices', authenticateToken, createInvoice);
router.put('/invoices/:id', authenticateToken, updateInvoice);
router.delete('/invoices/:id', authenticateToken, deleteInvoice);
```

### Step 9: Register Auth Routes in App (15 min)

**Modify**: `packages/backend/src/app.ts` (or `index.ts`)

```typescript
import authRoutes from './routes/auth';

// Register auth routes BEFORE other routes
app.use('/api/auth', authRoutes);

// Existing routes...
app.use('/api', quoteRoutes);
app.use('/api', reservationRoutes);
app.use('/api', invoiceRoutes);
```

### Step 10: Environment Configuration (15 min)

**Create/Update**: `packages/backend/.env`

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/studio_revenue
```

**Update**: `packages/backend/.env.example`
```bash
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://user:password@localhost:5432/studio_revenue
```

### Step 11: Integration Tests (3 hours)

**Create**: `packages/backend/src/routes/__tests__/auth.test.ts`

```typescript
import request from 'supertest';
import app from '../../app';
import pool from '../../db';

describe('Authentication API', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Pass123!',
          name: 'User 1',
        });

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Pass456!',
          name: 'User 2',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'LoginPass123!',
          name: 'Login Test',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'LoginPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'protected@example.com',
          password: 'ProtectedPass123!',
          name: 'Protected Test',
        });

      authToken = response.body.token;
    });

    it('should access protected route with token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('protected@example.com');
    });

    it('should reject protected route without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });
});
```

Run tests:
```bash
cd packages/backend
npm test -- auth.test.ts
```

## Testing Checklist

- [ ] User registration creates user in database
- [ ] Password is hashed (not stored as plaintext)
- [ ] Login returns valid JWT token
- [ ] Token expires after configured duration
- [ ] Protected routes reject requests without token
- [ ] Protected routes reject invalid/expired tokens
- [ ] invoice.ts uses authenticated user ID instead of 'system'
- [ ] All mutation endpoints require authentication
- [ ] Role-based authorization works (admin vs. staff)

## Success Criteria

1. ✅ No hard-coded 'system' user in invoice.ts
2. ✅ All discount logs track actual user ID
3. ✅ All POST/PUT/DELETE routes protected by authentication
4. ✅ JWT token generation and validation working
5. ✅ Password hashing with bcrypt (≥10 rounds)
6. ✅ Integration tests passing (≥80% coverage)
7. ✅ Environment variables configured
8. ✅ Database migration successful

## Coordination Notes

### Dependencies on Other Tracks
- **None**: This track is independent and can proceed immediately

### Shared Files (Potential Conflicts)
- `packages/backend/src/app.ts` - May conflict with Track 4 (calendar routes)
  - **Resolution**: Track 1 adds auth routes first, Track 4 adds calendar routes below

### Integration Points
- **Track 4 (Google Calendar)**: Will use authentication middleware for calendar sync endpoints
- **Track 5 (CSV Upload)**: Will use requireRole('admin', 'staff') for transaction upload

## Deployment Notes

### Environment Variables Required
```bash
JWT_SECRET=<generate-strong-secret-in-production>
JWT_EXPIRES_IN=7d
```

### Generate Production JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Security Checklist
- [ ] JWT_SECRET is strong random string (≥64 characters)
- [ ] JWT_SECRET is stored in environment variables (not committed)
- [ ] Password hashing uses bcrypt with ≥10 rounds
- [ ] HTTPS enforced in production
- [ ] Token expiration configured (recommended: 7 days)
- [ ] Rate limiting on /auth/login endpoint (prevent brute force)

## Timeline

**Day 1** (8 hours):
- Steps 1-5: Type definitions, middleware, auth routes (6 hours)
- Step 6: Database migration (1 hour)
- Step 7-9: Update routes, register routes (1 hour)

**Day 2** (8 hours):
- Step 10: Environment configuration (0.5 hours)
- Step 11: Integration tests (3 hours)
- Testing & debugging (3 hours)
- Code review & documentation (1.5 hours)

**Day 3** (optional buffer):
- Frontend integration support
- Additional test cases
- Performance optimization

## Resources

- JWT.io Debugger: https://jwt.io/
- bcrypt Rounds Calculator: https://github.com/kelektiv/node.bcrypt.js#a-note-on-rounds
- Express TypeScript Guide: https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html
