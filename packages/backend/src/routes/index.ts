import { Router } from 'express';
import quoteRouter from './quote';
import reservationRouter from './reservation';
import invoiceRouter from './invoice';

const router = Router();

// API version info
router.get('/', (_req, res) => {
  res.json({
    name: 'Studio Revenue Manager API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      quote: '/api/quote',
      reservation: '/api/reservation',
      invoice: '/api/invoice',
    },
  });
});

// Route imports
router.use('/quote', quoteRouter);
router.use('/reservation', reservationRouter);
router.use('/invoice', invoiceRouter);

export default router;
