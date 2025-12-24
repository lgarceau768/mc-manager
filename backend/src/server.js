import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import logger from './utils/logger.js';
import apiRouter from './api/index.js';
import consoleStream from './websocket/consoleStream.js';
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

// Graceful shutdown handler
const shutdown = () => {
  logger.info('Shutting down gracefully...');

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
