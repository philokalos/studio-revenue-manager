/**
 * Database Health Check and Monitoring
 * Track 2: Database Connection Pooling
 */

import pool from './index';

export interface HealthStatus {
  healthy: boolean;
  timestamp: string;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  latency?: number;
  error?: string;
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    // Execute simple query to test connection
    await pool.query('SELECT 1');

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      error: error.message || 'Unknown database error',
    };
  }
}

/**
 * Get detailed pool metrics
 */
export function getPoolMetrics() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    timestamp: new Date().toISOString(),
    usage: {
      active: pool.totalCount - pool.idleCount,
      utilizationPercent: ((pool.totalCount - pool.idleCount) / pool.totalCount) * 100,
    },
  };
}

/**
 * Check if pool is nearing capacity
 */
export function isPoolNearCapacity(threshold: number = 0.8): boolean {
  const utilizationPercent = ((pool.totalCount - pool.idleCount) / pool.totalCount);
  return utilizationPercent >= threshold;
}

/**
 * Wait for pool to have available connections
 */
export async function waitForAvailableConnection(
  timeoutMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (pool.idleCount > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
