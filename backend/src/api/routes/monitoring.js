import express from 'express';
import monitoringService from '../../services/monitoringService.js';
import logger from '../../utils/logger.js';
import { asyncHandler } from '../../utils/errors.js';

const router = express.Router();

/**
 * Get current stats for a specific server
 * GET /api/servers/:serverId/stats
 */
router.get('/:serverId/stats', asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  const stats = await monitoringService.getServerStats(serverId);

  res.json({
    success: true,
    stats
  });
}));

/**
 * Get metrics history for a server
 * GET /api/servers/:serverId/metrics-history
 */
router.get('/:serverId/metrics-history', asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const limit = parseInt(req.query.limit) || 60;

  const history = monitoringService.getMetricsHistory(serverId, limit);

  res.json({
    success: true,
    history
  });
}));

/**
 * Get stats for all servers
 * GET /api/monitoring/all-servers
 */
router.get('/all-servers', asyncHandler(async (req, res) => {
  const stats = await monitoringService.getAllServersStats();

  res.json({
    success: true,
    stats
  });
}));

/**
 * Get system summary
 * GET /api/monitoring/summary
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const summary = await monitoringService.getSystemSummary();

  res.json({
    success: true,
    summary
  });
}));

export default router;
