# Track 2: Database Connection Pooling Optimization

**Developer**: Developer B
**Duration**: 1 day
**Priority**: 🚨 Urgent & Important
**Risk**: Connection exhaustion under load

## Objective

Configure production-ready PostgreSQL connection pooling with retry logic, health checks, and monitoring to prevent connection exhaustion and improve reliability.

## Current State Analysis

### Existing Configuration
**File**: `packages/backend/src/db/index.ts`

Current implementation likely uses default `pg.Pool` settings which are not optimized for production:
- Default max connections: 10 (too low for concurrent requests)
- No connection timeout handling
- No retry logic for transient failures
- No connection health monitoring

### Production Risk Scenario
With default settings:
- 10 concurrent API requests → all connections consumed
- 11th request → waits indefinitely or times out
- Database restart → all connections fail permanently
- Result: API becomes unresponsive

## Implementation Plan

### Step 1: Analyze Current Database Configuration (30 min)

**Read**: `packages/backend/src/db/index.ts`

Expected current structure:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

**Issues**:
1. No max connection limit specified
2. No timeout configuration
3. No error handling for connection failures
4. No connection lifecycle management

### Step 2: Configure Production Pool Settings (1 hour)

**Modify**: `packages/backend/src/db/index.ts`

```typescript
import { Pool, PoolConfig, PoolClient } from 'pg';

// Production-optimized pool configuration
const poolConfig: PoolConfig = {
  // Connection string or individual params
  connectionString: process.env.DATABASE_URL,

  // Pool Size Configuration
  max: 20,                      // Maximum connections in pool
  min: 2,                       // Minimum idle connections

  // Timeout Configuration
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Wait max 2s for connection

  // Connection Lifecycle
  maxUses: 7500,                // Recycle connection after 7500 queries

  // Application Name (for monitoring)
  application_name: 'studio-revenue-manager',
};

// Create pool with error handling
const pool = new Pool(poolConfig);

// Global error handler for unexpected pool errors
pool.on('error', (err: Error, client: PoolClient) => {
  console.error('Unexpected pool error:', err);
  // Don't exit process - let error handling middleware deal with it
});

// Pool lifecycle events for monitoring
pool.on('connect', (client: PoolClient) => {
  console.log('New client connected to database');
});

pool.on('acquire', (client: PoolClient) => {
  // Track active connections for monitoring
  const activeCount = pool.totalCount - pool.idleCount;
  if (activeCount > pool.options.max! * 0.8) {
    console.warn(`High connection usage: ${activeCount}/${pool.options.max} active`);
  }
});

pool.on('remove', (client: PoolClient) => {
  console.log('Client removed from pool');
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

export default pool;
```

### Step 3: Add Connection Health Check (1 hour)

**Create**: `packages/backend/src/db/health.ts`

```typescript
import pool from './index';

export interface HealthCheckResult {
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingRequests: number;
  maxConnections: number;
  utilizationPercent: number;
  latencyMs?: number;
  error?: string;
}

/**
 * Check database connection health
 * Returns pool statistics and connection latency
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Test query with timeout
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    const latencyMs = Date.now() - startTime;
    const totalConnections = pool.totalCount;
    const idleConnections = pool.idleCount;
    const activeConnections = totalConnections - idleConnections;
    const waitingRequests = pool.waitingCount;
    const maxConnections = pool.options.max || 20;
    const utilizationPercent = (activeConnections / maxConnections) * 100;

    return {
      healthy: true,
      totalConnections,
      idleConnections,
      activeConnections,
      waitingRequests,
      maxConnections,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      latencyMs,
    };
  } catch (error) {
    return {
      healthy: false,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      activeConnections: pool.totalCount - pool.idleCount,
      waitingRequests: pool.waitingCount,
      maxConnections: pool.options.max || 20,
      utilizationPercent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check endpoint middleware
 */
export async function healthCheckMiddleware(req: any, res: any): Promise<void> {
  const health = await checkDatabaseHealth();

  const statusCode = health.healthy ? 200 : 503;

  res.status(statusCode).json({
    status: health.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: health,
  });
}
```

**Register health endpoint** in `packages/backend/src/app.ts`:

```typescript
import { healthCheckMiddleware } from './db/health';

// Health check endpoint (no auth required)
app.get('/health', healthCheckMiddleware);
app.get('/health/db', healthCheckMiddleware);
```

### Step 4: Implement Retry Logic with Exponential Backoff (2 hours)

**Create**: `packages/backend/src/db/retry.ts`

```typescript
import { Pool, QueryConfig, QueryResult } from 'pg';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: Set<string>;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: new Set([
    '57P03', // cannot_connect_now
    '53300', // too_many_connections
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
  ]),
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable based on PostgreSQL error code
 */
function isRetryableError(error: any, retryableErrors: Set<string>): boolean {
  return error?.code && retryableErrors.has(error.code);
}

/**
 * Execute query with automatic retry on transient failures
 */
export async function queryWithRetry(
  pool: Pool,
  queryTextOrConfig: string | QueryConfig,
  values?: any[],
  options: RetryOptions = {}
): Promise<QueryResult> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Attempt query
      const result = typeof queryTextOrConfig === 'string'
        ? await pool.query(queryTextOrConfig, values)
        : await pool.query(queryTextOrConfig);

      // Success - return immediately
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        // Not retryable - throw immediately
        throw lastError;
      }

      // Last attempt failed
      if (attempt === opts.maxRetries) {
        console.error(`Query failed after ${opts.maxRetries} retries:`, lastError);
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
      const jitter = Math.random() * baseDelay * 0.1; // ±10% jitter
      const delay = Math.min(baseDelay + jitter, opts.maxDelayMs);

      console.warn(
        `Query failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms:`,
        lastError.message
      );

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here due to throw in loop
  throw lastError || new Error('Query failed with unknown error');
}

/**
 * Execute transaction with automatic retry
 */
export async function transactionWithRetry<T>(
  pool: Pool,
  callback: (client: any) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      client.release();
      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();

      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error, opts.retryableErrors)) {
        throw lastError;
      }

      if (attempt === opts.maxRetries) {
        console.error(`Transaction failed after ${opts.maxRetries} retries:`, lastError);
        throw lastError;
      }

      const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
      const jitter = Math.random() * baseDelay * 0.1;
      const delay = Math.min(baseDelay + jitter, opts.maxDelayMs);

      console.warn(
        `Transaction failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms:`,
        lastError.message
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Transaction failed with unknown error');
}
```

### Step 5: Add Query Timeout Handling (1 hour)

**Modify**: `packages/backend/src/db/index.ts`

Add timeout configuration to pool:

```typescript
const poolConfig: PoolConfig = {
  // ... existing config ...

  // Query timeout (5 seconds default)
  statement_timeout: 5000,

  // Query cancellation on timeout
  query_timeout: 5000,
};
```

**Create query timeout wrapper**:

```typescript
// In packages/backend/src/db/index.ts

export async function queryWithTimeout<T = any>(
  queryText: string,
  values?: any[],
  timeoutMs: number = 5000
): Promise<QueryResult<T>> {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms: ${queryText.substring(0, 100)}`));
    }, timeoutMs);

    try {
      const result = await pool.query<T>(queryText, values);
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}
```

### Step 6: Update Existing Route Files (1 hour)

**Modify**: `packages/backend/src/routes/invoice.ts`, `quote.ts`, `reservation.ts`

Replace direct `pool.query()` calls with `queryWithRetry()`:

```typescript
// Before:
import pool from '../db';
const result = await pool.query('SELECT ...', [param1, param2]);

// After:
import pool from '../db';
import { queryWithRetry } from '../db/retry';
const result = await queryWithRetry(pool, 'SELECT ...', [param1, param2]);
```

**Update transaction code**:

```typescript
// Before:
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... transaction queries ...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

// After:
import { transactionWithRetry } from '../db/retry';

await transactionWithRetry(pool, async (client) => {
  // ... transaction queries ...
  // BEGIN and COMMIT handled automatically
});
```

### Step 7: Add Monitoring Metrics Endpoint (1 hour)

**Create**: `packages/backend/src/routes/metrics.ts`

```typescript
import { Router } from 'express';
import pool from '../db';
import { checkDatabaseHealth } from '../db/health';

const router = Router();

// GET /api/metrics/db
router.get('/db', async (req, res) => {
  const health = await checkDatabaseHealth();

  res.json({
    timestamp: new Date().toISOString(),
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      active: pool.totalCount - pool.idleCount,
      waiting: pool.waitingCount,
      max: pool.options.max,
      utilizationPercent: health.utilizationPercent,
    },
    performance: {
      latencyMs: health.latencyMs,
    },
    config: {
      maxConnections: pool.options.max,
      idleTimeoutMs: pool.options.idleTimeoutMillis,
      connectionTimeoutMs: pool.options.connectionTimeoutMillis,
    },
  });
});

export default router;
```

**Register in app**:

```typescript
import metricsRoutes from './routes/metrics';
app.use('/api/metrics', metricsRoutes);
```

### Step 8: Environment Configuration (30 min)

**Update**: `packages/backend/.env.example`

```bash
# Database Connection Pooling
DATABASE_URL=postgresql://user:password@localhost:5432/studio_revenue
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
DB_STATEMENT_TIMEOUT_MS=5000

# Retry Configuration
DB_MAX_RETRIES=3
DB_RETRY_INITIAL_DELAY_MS=100
DB_RETRY_MAX_DELAY_MS=5000
```

**Update pool config to use environment variables**:

```typescript
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000', 10),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '5000', 10),
  application_name: 'studio-revenue-manager',
};
```

## Testing Checklist

### Unit Tests

**Create**: `packages/backend/src/db/__tests__/retry.test.ts`

```typescript
import { queryWithRetry, transactionWithRetry } from '../retry';
import pool from '../index';

describe('Database Retry Logic', () => {
  describe('queryWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const result = await queryWithRetry(pool, 'SELECT 1 as num');
      expect(result.rows[0].num).toBe(1);
    });

    it('should retry on connection failure', async () => {
      // Mock transient failure
      let attempts = 0;
      const mockQuery = jest.spyOn(pool, 'query').mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Connection failed');
          error.code = '08000'; // connection_exception
          throw error;
        }
        return Promise.resolve({ rows: [{ num: 1 }], rowCount: 1 } as any);
      });

      const result = await queryWithRetry(pool, 'SELECT 1');
      expect(attempts).toBe(2);
      expect(result.rows[0].num).toBe(1);

      mockQuery.mockRestore();
    });

    it('should throw on non-retryable error', async () => {
      const mockQuery = jest.spyOn(pool, 'query').mockImplementation(() => {
        const error: any = new Error('Syntax error');
        error.code = '42601'; // syntax_error
        throw error;
      });

      await expect(queryWithRetry(pool, 'INVALID SQL')).rejects.toThrow('Syntax error');

      mockQuery.mockRestore();
    });

    it('should respect max retries', async () => {
      let attempts = 0;
      const mockQuery = jest.spyOn(pool, 'query').mockImplementation(() => {
        attempts++;
        const error: any = new Error('Connection failed');
        error.code = '08000';
        throw error;
      });

      await expect(
        queryWithRetry(pool, 'SELECT 1', [], { maxRetries: 2 })
      ).rejects.toThrow('Connection failed');

      expect(attempts).toBe(3); // Initial + 2 retries

      mockQuery.mockRestore();
    });
  });
});
```

### Integration Tests

```bash
# Test connection pool under load
cd packages/backend
npm run test -- --testPathPattern=db
```

### Load Testing

**Create**: `packages/backend/scripts/load-test-db.ts`

```typescript
import pool from '../src/db';
import { queryWithRetry } from '../src/db/retry';

async function loadTest() {
  const concurrentQueries = 50;
  const queriesPerConnection = 100;

  console.log(`Starting load test: ${concurrentQueries} concurrent connections`);
  console.log(`Each executing ${queriesPerConnection} queries`);

  const startTime = Date.now();

  const workers = Array(concurrentQueries).fill(0).map(async (_, i) => {
    for (let j = 0; j < queriesPerConnection; j++) {
      await queryWithRetry(pool, 'SELECT $1::int as num', [i * queriesPerConnection + j]);
    }
  });

  await Promise.all(workers);

  const duration = Date.now() - startTime;
  const totalQueries = concurrentQueries * queriesPerConnection;
  const qps = Math.round(totalQueries / (duration / 1000));

  console.log(`\nLoad test complete:`);
  console.log(`  Total queries: ${totalQueries}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Queries per second: ${qps}`);
  console.log(`  Pool stats:`);
  console.log(`    Total connections: ${pool.totalCount}`);
  console.log(`    Idle connections: ${pool.idleCount}`);
  console.log(`    Active connections: ${pool.totalCount - pool.idleCount}`);

  await pool.end();
}

loadTest().catch(console.error);
```

Run load test:
```bash
ts-node scripts/load-test-db.ts
```

## Success Criteria

- [ ] Pool configured with max=20, min=2 connections
- [ ] Connection timeout set to 2s
- [ ] Idle connections closed after 30s
- [ ] Query timeout set to 5s
- [ ] Retry logic implemented with exponential backoff (max 3 retries)
- [ ] Health check endpoint returns pool statistics
- [ ] Metrics endpoint shows connection utilization
- [ ] Graceful shutdown closes all connections
- [ ] Load test handles 50+ concurrent connections
- [ ] All existing routes use queryWithRetry
- [ ] Integration tests passing

## Performance Benchmarks

### Expected Metrics

**Before optimization** (default settings):
- Max connections: 10
- No retry logic
- Connection failures on load spike
- No monitoring

**After optimization** (production config):
- Max connections: 20
- Automatic retry on transient failures
- 50+ concurrent requests handled
- Real-time pool monitoring
- Connection utilization tracking

### Load Test Targets

- ✅ Handle 50 concurrent connections without errors
- ✅ Maintain <200ms average query latency
- ✅ Automatic recovery from database restart
- ✅ Connection pool utilization <80% under normal load

## Coordination Notes

### Dependencies on Other Tracks
- **Track 1 (Auth)**: Will use same pool with retry logic
- **Track 4 (Calendar)**: Will benefit from retry on Google Calendar → DB sync
- **Track 5 (CSV)**: Bulk inserts will use transaction retry logic

### Shared Files
- `packages/backend/src/db/index.ts` - Core file, coordinate changes
- `packages/backend/src/app.ts` - Adding health/metrics routes

### Integration Timeline
1. **Day 1 Morning**: Complete pool configuration and retry logic
2. **Day 1 Afternoon**: Update existing routes, add tests
3. **Day 1 EOD**: Code review, merge to develop

## Deployment Checklist

### Production Environment Variables
```bash
DATABASE_URL=postgresql://user:password@prod-db:5432/studio_revenue
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
DB_STATEMENT_TIMEOUT_MS=5000
```

### Monitoring Setup
- Set up alerts for pool utilization >80%
- Monitor query latency >500ms
- Track connection failures and retries
- Dashboard for pool metrics

### Rollback Plan
If issues occur:
1. Revert to previous `db/index.ts` (default pool settings)
2. Remove retry logic (direct pool.query calls)
3. Monitor for connection errors
4. Plan fix for next deployment

## Resources

- node-postgres Pool Documentation: https://node-postgres.com/features/pooling
- PostgreSQL Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
- Connection Pooling Best Practices: https://wiki.postgresql.org/wiki/Number_Of_Database_Connections
