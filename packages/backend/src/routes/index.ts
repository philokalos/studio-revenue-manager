import { Router } from 'express';
import authRouter from './auth';
import quoteRouter from './quote';
import reservationRouter from './reservation';
import invoiceRouter from './invoice';
import calendarRouter from './calendar';
import csvBankRouter from './csv-bank';
import monitoringRouter from './monitoring';
import { authRateLimiter, apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// API version info
router.get('/', (_req, res) => {
  res.json({
    name: 'Studio Revenue Manager API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      quote: '/api/quote',
      reservation: '/api/reservation',
      invoice: '/api/invoice',
      calendar: '/api/calendar',
      csvBank: '/api/csv-bank',
      monitoring: '/api/monitoring',
    },
  });
});

// Route imports
// Track 1: Authentication routes (stricter rate limiting)
router.use('/auth', authRateLimiter, authRouter);

// Business logic routes (standard API rate limiting)
router.use('/quote', apiRateLimiter, quoteRouter);
router.use('/reservation', apiRateLimiter, reservationRouter);
router.use('/invoice', apiRateLimiter, invoiceRouter);

// Track 4: Google Calendar integration
router.use('/calendar', apiRateLimiter, calendarRouter);

// Track 5: CSV Bank Matching
router.use('/csv-bank', apiRateLimiter, csvBankRouter);

// Monitoring and metrics
router.use('/monitoring', apiRateLimiter, monitoringRouter);

export default router;
