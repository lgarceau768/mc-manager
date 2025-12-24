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

/**
 * IMPORTANT: Specific routes must come BEFORE parameterized routes
 * Otherwise /:type will match /import and /imported
 */

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

/**
 * Get saved modpacks for a type
 * GET /api/modpacks/:type
 */
router.get('/', async (req, res, next) => {
  try {
    const modpacks = serverService.listAllSavedModpacks();
    res.json(modpacks);
  } catch (error) {
    next(error);
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

/**
 * Upload modpack file
 * POST /api/modpacks/:type
 */
router.post('/:type', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Modpack file is required');
    }
    const { type } = req.params;
    const normalizedType = modpackImportService.normalizeServerType(type);
    const metadata = modpackImportService.extractZipMetadata(req.file.path);
    const loaderPreference = modpackImportService.getLoaderPreference(metadata);

    if (loaderPreference && loaderPreference !== normalizedType) {
      throw new ValidationError(
        `Uploaded modpack targets ${loaderPreference}, but you selected ${normalizedType}.`
      );
    }

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
 * Delete a saved modpack
 * DELETE /api/modpacks/:type/:filename
 */
router.delete('/:type/:filename', async (req, res, next) => {
  try {
    const { type, filename } = req.params;
    const result = serverService.deleteSavedModpack(type, filename);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
