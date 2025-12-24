import express from 'express';
import serversRouter from './routes/servers.js';
import modpacksRouter from './routes/modpacks.js';
import { errorHandler } from '../utils/errors.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Request logging middleware
router.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
});

// Mount routes
router.use('/servers', serversRouter);
router.use('/modpacks', modpacksRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'API endpoint not found',
      code: 'NotFound'
    }
  });
});

// Error handler (must be last)
router.use(errorHandler);

export default router;
