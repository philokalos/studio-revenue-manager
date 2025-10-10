import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
// Track 2: Production-ready pool settings
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Pool size configuration
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients to keep in pool

  // Timeout configuration
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle (30s)
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client (2s)

  // Query timeout - prevents long-running queries from blocking
  statement_timeout: 5000, // 5 seconds max query execution time

  // Application name for monitoring
  application_name: process.env.APP_NAME || 'studio-revenue-manager',
};

// Create the connection pool
const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Log successful connection
pool.on('connect', () => {
  console.log('📦 Database connected successfully');
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async () => {
  return await pool.connect();
};

// Graceful shutdown
export const closePool = async () => {
  await pool.end();
  console.log('🔌 Database pool closed');
};

// Export as db for convenience
export const db = {
  query,
  connect: getClient,
  pool,
  close: closePool
};

export default pool;
