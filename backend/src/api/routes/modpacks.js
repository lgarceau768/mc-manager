import express from 'express';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import serverService from '../../services/serverService.js';
import modpackImportService from '../../services/modpackImportService.js';
import { ValidationError } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB
  }
});

router.get('/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const modpacks = serverService.listSavedModpacks(type);
    res.json(modpacks);
  } catch (error) {
    next(error);
  }
});

router.post('/:type', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Modpack file is required');
    }
    const { type } = req.params;
    const saved = serverService.saveModpackFile(type, req.file);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

/**
 * Import modpack from URL (CurseForge, Modrinth, or direct)
 * POST /api/modpacks/import
 */
router.post('/import', asyncHandler(async (req, res) => {
  const { url, serverType } = req.body;

  if (!url) {
    throw new ValidationError('URL is required');
  }

  logger.info(`Importing modpack from URL: ${url}`);

  const result = await modpackImportService.importFromUrl(url, serverType);

  res.status(201).json({
    success: true,
    message: 'Modpack imported successfully',
    ...result
  });
}));

/**
 * List imported modpacks
 * GET /api/modpacks/imported/:type
 */
router.get('/imported/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;

  const modpacks = modpackImportService.listImportedModpacks(type);

  res.json({
    success: true,
    modpacks
  });
}));

export default router;
