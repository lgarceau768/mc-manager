import express from 'express';
import serversRouter from './routes/servers.js';
import modpacksRouter from './routes/modpacks.js';
import backupsRouter from './routes/backups.js';
import schedulesRouter from './routes/schedules.js';
import authRouter from './routes/auth.js';
import monitoringRouter from './routes/monitoring.js';
import modsRouter, { serverModsRouter, serverPlayersRouter } from './routes/mods.js';
import templatesRouter from './routes/templates.js';
import { errorHandler } from '../utils/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
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

// Public routes (no auth required)
// Auth routes (login must be public)
router.use('/auth', optionalAuthMiddleware, authRouter);

// Health check endpoint (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (require authentication when enabled)
router.use(authMiddleware);

// Mount protected routes
router.use('/servers', serversRouter);
router.use('/servers', backupsRouter);
router.use('/servers', schedulesRouter);
router.use('/servers', monitoringRouter);
router.use('/servers/:id/mods', serverModsRouter);
router.use('/servers/:id/players', serverPlayersRouter);
router.use('/schedules', schedulesRouter);
router.use('/monitoring', monitoringRouter);
router.use('/modpacks', modpacksRouter);
router.use('/mods', modsRouter);
router.use('/templates', templatesRouter);

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
