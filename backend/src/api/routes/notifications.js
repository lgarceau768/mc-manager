import express from 'express';
import notificationService from '../../services/notificationService.js';
import logger from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

const router = express.Router();

/**
 * GET /api/servers/:id/notifications
 * Get notification settings for a server
 */
router.get('/:id/notifications', async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = notificationService.getSettings(id);

    // Don't expose the full webhook URL for security
    const safeSettings = {
      ...settings,
      discordWebhookUrl: settings.discordWebhookUrl ? '••••••••' : ''
    };

    res.json(safeSettings);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/servers/:id/notifications
 * Update notification settings for a server
 */
router.put('/:id/notifications', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discordWebhookUrl, enabled, events } = req.body;

    // Build update object
    const updates = {};

    if (typeof enabled === 'boolean') {
      updates.enabled = enabled;
    }

    if (events && typeof events === 'object') {
      updates.events = events;
    }

    // Only update webhook URL if explicitly provided (not masked)
    if (discordWebhookUrl !== undefined && discordWebhookUrl !== '••••••••') {
      updates.discordWebhookUrl = discordWebhookUrl;
    }

    const settings = notificationService.saveSettings(id, updates);

    // Return safe settings
    const safeSettings = {
      ...settings,
      discordWebhookUrl: settings.discordWebhookUrl ? '••••••••' : ''
    };

    logger.info(`Notification settings updated for server ${id}`);
    res.json(safeSettings);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/notifications/test
 * Test the Discord webhook
 */
router.post('/:id/notifications/test', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { webhookUrl } = req.body;

    // If no webhook URL provided, use the saved one
    let urlToTest = webhookUrl;
    if (!urlToTest || urlToTest === '••••••••') {
      const settings = notificationService.getSettings(id);
      urlToTest = settings.discordWebhookUrl;
    }

    if (!urlToTest) {
      throw new ValidationError('No webhook URL configured');
    }

    const result = await notificationService.testWebhook(id, urlToTest);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
