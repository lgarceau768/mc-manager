import express from 'express';
import backupService from '../../services/backupService.js';
import logger from '../../utils/logger.js';
import { asyncHandler } from '../../utils/errors.js';

const router = express.Router();

/**
 * Create a backup for a server
 * POST /api/servers/:serverId/backups
 */
router.post('/:serverId/backups', asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const { description } = req.body;

  logger.info(`Creating backup for server: ${serverId}`);

  const backup = await backupService.createBackup(serverId, description);

  res.status(201).json({
    success: true,
    message: 'Backup created successfully',
    backup
  });
}));

/**
 * List all backups for a server
 * GET /api/servers/:serverId/backups
 */
router.get('/:serverId/backups', asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  logger.info(`Listing backups for server: ${serverId}`);

  const backups = backupService.listBackups(serverId);

  res.json({
    success: true,
    backups
  });
}));

/**
 * Get backup statistics for a server
 * GET /api/servers/:serverId/backups/stats
 */
router.get('/:serverId/backups/stats', asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  logger.info(`Getting backup stats for server: ${serverId}`);

  const stats = backupService.getBackupStats(serverId);

  res.json({
    success: true,
    stats
  });
}));

/**
 * Download a backup
 * GET /api/servers/:serverId/backups/:backupId/download
 */
router.get('/:serverId/backups/:backupId/download', asyncHandler(async (req, res) => {
  const { serverId, backupId } = req.params;

  logger.info(`Downloading backup: ${backupId} for server: ${serverId}`);

  const { metadata, filePath } = backupService.getBackup(serverId, backupId);

  res.download(filePath, metadata.fileName, (err) => {
    if (err) {
      logger.error(`Error downloading backup: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to download backup'
        });
      }
    }
  });
}));

/**
 * Restore a backup
 * POST /api/servers/:serverId/backups/:backupId/restore
 */
router.post('/:serverId/backups/:backupId/restore', asyncHandler(async (req, res) => {
  const { serverId, backupId } = req.params;

  logger.info(`Restoring backup: ${backupId} for server: ${serverId}`);

  const result = await backupService.restoreBackup(serverId, backupId);

  res.json({
    success: true,
    message: result.message,
    safetyBackupId: result.safetyBackupId
  });
}));

/**
 * Delete a backup
 * DELETE /api/servers/:serverId/backups/:backupId
 */
router.delete('/:serverId/backups/:backupId', asyncHandler(async (req, res) => {
  const { serverId, backupId } = req.params;

  logger.info(`Deleting backup: ${backupId} for server: ${serverId}`);

  await backupService.deleteBackup(serverId, backupId);

  res.json({
    success: true,
    message: 'Backup deleted successfully'
  });
}));

export default router;
