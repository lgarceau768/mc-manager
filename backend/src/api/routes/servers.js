import express from 'express';
import serverService from '../../services/serverService.js';
import { validate, createServerSchema } from '../../utils/validation.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/servers
 * Create a new server
 */
router.post('/', validate(createServerSchema), async (req, res, next) => {
  try {
    const { name, version, memory, cpuLimit } = req.body;

    const server = await serverService.createServer({
      name,
      version,
      memory,
      cpuLimit
    });

    logger.info(`Server created via API: ${server.id}`);
    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers
 * List all servers
 */
router.get('/', async (req, res, next) => {
  try {
    const servers = await serverService.listServers();
    res.json(servers);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id
 * Get server details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.getServerDetails(id);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/start
 * Start a server
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.startServer(id);

    logger.info(`Server started via API: ${id}`);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/stop
 * Stop a server
 */
router.post('/:id/stop', async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.stopServer(id);

    logger.info(`Server stopped via API: ${id}`);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/restart
 * Restart a server
 */
router.post('/:id/restart', async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.restartServer(id);

    logger.info(`Server restarted via API: ${id}`);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/servers/:id
 * Delete a server
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await serverService.deleteServer(id);

    logger.info(`Server deleted via API: ${id}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/logs
 * Get server logs
 */
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tail = parseInt(req.query.tail) || 100;

    const logs = await serverService.getServerLogs(id, tail);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;
