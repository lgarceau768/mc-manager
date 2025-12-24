import express from 'express';
import schedulerService from '../../services/schedulerService.js';
import logger from '../../utils/logger.js';
import { asyncHandler } from '../../utils/errors.js';
import Joi from 'joi';
import { ValidationError } from '../../utils/errors.js';

const router = express.Router();

/**
 * Validation schema for schedule
 */
const scheduleSchema = Joi.object({
  enabled: Joi.boolean().required(),
  frequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').required(),
  retentionCount: Joi.number().integer().min(1).max(50).required()
});

/**
 * Get backup schedule for a server
 * GET /api/servers/:serverId/schedule
 */
router.get('/:serverId/schedule', asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  logger.info(`Getting backup schedule for server: ${serverId}`);

  const schedule = schedulerService.getSchedule(serverId);

  if (!schedule) {
    return res.json({
      success: true,
      schedule: null
    });
  }

  res.json({
    success: true,
    schedule
  });
}));

/**
 * Create or update backup schedule for a server
 * POST /api/servers/:serverId/schedule
 */
router.post('/:serverId/schedule', asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const { enabled, frequency, retentionCount } = req.body;

  // Validate input
  const { error } = scheduleSchema.validate({ enabled, frequency, retentionCount });
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  logger.info(`Creating/updating backup schedule for server: ${serverId}`);

  const schedule = await schedulerService.createOrUpdateSchedule(serverId, {
    enabled,
    frequency,
    retention_count: retentionCount
  });

  res.json({
    success: true,
    message: 'Backup schedule updated successfully',
    schedule
  });
}));

/**
 * Delete backup schedule for a server
 * DELETE /api/servers/:serverId/schedule
 */
router.delete('/:serverId/schedule', asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  logger.info(`Deleting backup schedule for server: ${serverId}`);

  const deleted = await schedulerService.deleteSchedule(serverId);

  if (!deleted) {
    return res.json({
      success: false,
      message: 'No schedule found to delete'
    });
  }

  res.json({
    success: true,
    message: 'Backup schedule deleted successfully'
  });
}));

/**
 * Get available backup frequencies
 * GET /api/schedules/frequencies
 */
router.get('/frequencies', asyncHandler(async (req, res) => {
  const frequencies = schedulerService.getAvailableFrequencies();

  res.json({
    success: true,
    frequencies
  });
}));

export default router;
