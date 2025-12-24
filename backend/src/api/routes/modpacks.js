import express from 'express';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import serverService from '../../services/serverService.js';
import { ValidationError } from '../../utils/errors.js';

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

export default router;
