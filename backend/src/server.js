import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import logger from './utils/logger.js';
import apiRouter from './api/index.js';
import consoleStream from './websocket/consoleStream.js';
import schedulerService from './services/schedulerService.js';
import db from './models/db.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRouter);

/**
 * If a built frontend exists, serve it from this process so that a single
 * Docker image can expose both the API and UI.
 */
const attachFrontendBundle = () => {
  const distPath = process.env.FRONTEND_DIST_PATH;
  if (!distPath) {
    return;
  }

  const resolvedPath = path.resolve(distPath);
  if (!fs.existsSync(resolvedPath)) {
    logger.warn(`FRONTEND_DIST_PATH set to ${resolvedPath}, but directory was not found`);
    return;
  }

  logger.info(`Serving frontend assets from ${resolvedPath}`);
  app.use(express.static(resolvedPath));

  app.get('*', (req, res, next) => {
    // Let API and WebSocket routes fall through to their handlers
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }

    res.sendFile(path.join(resolvedPath, 'index.html'));
  });
};

attachFrontendBundle();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Minecraft Server Manager API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      api: '/api',
      health: '/api/health',
      websocket: '/ws/console?serverId=<id>'
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
consoleStream.initialize(server);

// Initialize backup scheduler
(async () => {
  try {
    await schedulerService.initialize();
    logger.info('Backup scheduler initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize backup scheduler: ${error.message}`);
  }
})();

// Graceful shutdown handler
const shutdown = () => {
  logger.info('Shutting down gracefully...');

  // Stop scheduler
  try {
    schedulerService.shutdown();
    logger.info('Scheduler stopped');
  } catch (error) {
    logger.error(`Error stopping scheduler: ${error.message}`);
  }

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    try {
      db.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error(`Error closing database: ${error.message}`);
    }

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`WebSocket server ready at ws://localhost:${PORT}/ws/console`);
  logger.info(`API endpoints available at http://localhost:${PORT}/api`);
});

export default app;
