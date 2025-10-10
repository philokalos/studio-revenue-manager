import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPerformanceMetrics } from '../middleware/performance';
import { getQueryStats } from '../db/queryLogger';
import logger from '../config/logger';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Health check endpoint - detailed
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
      memory: {
        used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };

    res.json(health);
  })
);

// Application metrics endpoint
router.get(
  '/metrics',
  asyncHandler(async (_req: Request, res: Response) => {
    const performanceMetrics = getPerformanceMetrics();
    const queryStats = getQueryStats();

    const metrics = {
      timestamp: new Date().toISOString(),
      performance: {
        requestCount: performanceMetrics.requestCount,
        averageResponseTime: Math.round(performanceMetrics.averageResponseTime),
        slowRequests: performanceMetrics.slowRequests,
        slowRequestPercentage:
          performanceMetrics.requestCount > 0
            ? ((performanceMetrics.slowRequests / performanceMetrics.requestCount) * 100).toFixed(2) + '%'
            : '0%',
      },
      database: {
        totalQueries: queryStats.totalQueries,
        slowQueries: queryStats.slowQueries,
        failedQueries: queryStats.failedQueries,
        averageExecutionTime: Math.round(queryStats.averageExecutionTime),
        slowQueryPercentage:
          queryStats.totalQueries > 0
            ? ((queryStats.slowQueries / queryStats.totalQueries) * 100).toFixed(2) + '%'
            : '0%',
      },
      memory: {
        heapUsed: `${(performanceMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(performanceMetrics.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(performanceMetrics.memory.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(performanceMetrics.memory.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      system: {
        uptime: `${Math.floor(process.uptime())} seconds`,
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV,
      },
    };

    res.json(metrics);
  })
);

// Recent logs endpoint (admin only - add auth middleware in production)
router.get(
  '/logs',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // TODO: Add admin authentication middleware
    // if (!req.user?.isAdmin) {
    //   res.status(403).json({ error: 'Forbidden' });
    //   return;
    // }

    const { level = 'info', limit = '100' } = req.query;
    const logLimit = Math.min(parseInt(limit as string, 10), 1000);

    try {
      // Read the most recent log file
      const logsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsDir);

      // Filter for application log files and sort by date
      const logFiles = files
        .filter((f) => f.startsWith('application-') && f.endsWith('.log'))
        .sort()
        .reverse();

      if (logFiles.length === 0) {
        res.json({ logs: [] });
        return;
      }

      // Read the most recent log file
      const logPath = path.join(logsDir, logFiles[0]);
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      // Parse JSON log entries
      const logs = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((log) => log !== null)
        .filter((log) => {
          // Filter by log level if specified
          if (level === 'all') return true;
          return log.level === level;
        })
        .slice(-logLimit)
        .reverse();

      res.json({
        file: logFiles[0],
        count: logs.length,
        logs,
      });
    } catch (error) {
      logger.error('Failed to read log files', { error });
      res.status(500).json({ error: 'Failed to read logs' });
    }
  })
);

// System info endpoint
router.get(
  '/system',
  asyncHandler(async (_req: Request, res: Response) => {
    const info = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      process: {
        pid: process.pid,
        uptime: `${Math.floor(process.uptime())} seconds`,
        argv: process.argv,
        execPath: process.execPath,
        cwd: process.cwd(),
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV,
    };

    res.json(info);
  })
);

export default router;
