import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { httpLogger } from './middleware/httpLogger';
import { performanceMonitor, startPerformanceMonitoring } from './middleware/performance';
import { securityMiddleware } from './middleware/security';
import { corsMiddleware } from './middleware/cors';
import { generalRateLimiter } from './middleware/rateLimit';
import routes from './routes';
import { checkDatabaseHealth, getPoolMetrics } from './db/health';
import swaggerSpec from './config/swagger';
import { env, printEnvSummary } from './config/env';
import winstonLogger from './config/logger';
import { logSystemStartup, logSystemShutdown } from './utils/eventLogger';
import { logQueryStatsPeriodically } from './db/queryLogger';

// Load and validate environment variables
dotenv.config();

const app: Application = express();
const PORT = env.PORT;

// Trust proxy for rate limiting (if behind reverse proxy like nginx)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware (MUST be first)
app.use(securityMiddleware);

// CORS middleware
app.use(corsMiddleware);

// General rate limiter (applied to all routes)
app.use(generalRateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging and performance middleware
app.use(httpLogger);
app.use(performanceMonitor);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Studio Revenue Manager API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns system health status including database connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 *                 database:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       503:
 *         description: System is unhealthy
 */
app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  res.status(dbHealth.healthy ? 200 : 503).json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbHealth,
  });
});

/**
 * @swagger
 * /api/metrics/db:
 *   get:
 *     summary: Database metrics endpoint
 *     description: Returns database connection pool metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: Total number of connections in pool
 *                 idle:
 *                   type: number
 *                   description: Number of idle connections
 *                 waiting:
 *                   type: number
 *                   description: Number of waiting clients
 */
app.get('/api/metrics/db', (_req: Request, res: Response) => {
  const metrics = getPoolMetrics();
  res.status(200).json(metrics);
});

// API routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  // Log to Winston
  winstonLogger.info('Server started successfully', {
    port: PORT,
    environment: env.NODE_ENV,
    nodeVersion: process.version,
  });

  // Log system startup event
  logSystemStartup();

  // Start performance monitoring (every 30 seconds)
  startPerformanceMonitoring(30000);

  // Start query stats logging (every 60 seconds)
  logQueryStatsPeriodically(60000);

  // Console output for developers
  console.log('\n🚀 Studio Revenue Manager API Server');
  console.log('=====================================');
  printEnvSummary();
  console.log('🔒 Security Features:');
  console.log('   ✅ Helmet.js security headers');
  console.log('   ✅ CORS protection');
  console.log('   ✅ Rate limiting');
  console.log('   ✅ Input validation');
  console.log('   ✅ SQL injection protection');
  console.log('   ✅ Winston logging');
  console.log('   ✅ Performance monitoring');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Monitoring: http://localhost:${PORT}/api/monitoring/metrics`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log('=====================================\n');
});

// Graceful shutdown handler
const gracefulShutdown = () => {
  winstonLogger.info('Shutdown signal received: closing HTTP server');
  logSystemShutdown();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
