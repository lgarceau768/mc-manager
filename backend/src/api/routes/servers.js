import express from 'express';
import os from 'os';
import multer from 'multer';
import serverService from '../../services/serverService.js';
import { validate, createServerSchema, updateServerSettingsSchema, updateServerResourcesSchema } from '../../utils/validation.js';
import logger from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

const router = express.Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 1024 * 1024 * 512 // 512MB
  }
});

/**
 * POST /api/servers
 * Create a new server
 */
router.post('/', validate(createServerSchema), async (req, res, next) => {
  try {
    const { name, version, memory, cpuLimit, type, modpack, port } = req.body;

    const server = await serverService.createServer({
      name,
      version,
      memory,
      cpuLimit,
      type,
      modpack,
      port
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

/**
 * POST /api/servers/:id/mods/upload
 * Upload a mod/plugin jar or import a server pack zip
 */
router.post('/:id/mods/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('A file is required');
    }

    const { id } = req.params;
    const result = await serverService.uploadModOrPack(id, req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/servers/:id/settings
 * Update server.properties values
 */
router.patch('/:id/settings', validate(updateServerSettingsSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.updateServerSettings(id, req.body);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/servers/:id/resources
 * Update server resource allocation (memory, CPU)
 */
router.patch('/:id/resources', validate(updateServerResourcesSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await serverService.updateServerResources(id, req.body);

    logger.info(`Server resources updated via API: ${id}`);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/icon
 * Upload server icon
 */
router.post('/:id/icon', upload.single('icon'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Icon file is required');
    }

    const { id } = req.params;
    const result = await serverService.updateServerIcon(id, req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/icon
 * Download server icon
 */
router.get('/:id/icon', async (req, res, next) => {
  try {
    const { id } = req.params;
    const iconPath = serverService.getServerIconPath(id);
    if (!iconPath) {
      return res.status(404).send('Icon not found');
    }
    return res.sendFile(iconPath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/files
 * List files in server volume
 */
router.get('/:id/files', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { path: targetPath = '' } = req.query;
    const result = await serverService.listServerFiles(id, targetPath);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/files/download
 * Download a file from the server volume
 */
router.get('/:id/files/download', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { path: targetPath = '' } = req.query;
    const file = serverService.getFileDownloadPath(id, targetPath);
    res.download(file.absolutePath, file.filename);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/files/upload
 * Upload arbitrary file to a directory
 */
router.post('/:id/files/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('A file is required');
    }

    const { id } = req.params;
    const { path: targetPath = '' } = req.body;
    const result = await serverService.uploadServerFile(id, targetPath, req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/apply-modpack
 * Apply a saved modpack to an existing server
 */
router.post('/:id/apply-modpack', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modpackFilename } = req.body;

    if (!modpackFilename) {
      throw new ValidationError('modpackFilename is required');
    }

    const result = await serverService.applyModpackToServer(id, modpackFilename);

    logger.info(`Modpack applied to server via API: ${id}`);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
