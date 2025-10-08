import { Router } from 'express';

const router = Router();

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'Studio Revenue Manager API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

// Future route imports will be added here
// Example:
// import studiosRouter from './studios';
// import projectsRouter from './projects';
// import revenueRouter from './revenue';
//
// router.use('/studios', studiosRouter);
// router.use('/projects', projectsRouter);
// router.use('/revenue', revenueRouter);

export default router;
