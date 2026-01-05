import express from 'express';
import composeTemplateService from '../../services/composeTemplateService.js';
import logger from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

const router = express.Router();

/**
 * GET /api/templates
 * List all available compose templates
 */
router.get('/', async (req, res, next) => {
  try {
    const { serverType, hasModpack, search } = req.query;

    const templates = await composeTemplateService.listTemplates({
      serverType,
      hasModpack: hasModpack === 'true',
      search
    });

    res.json({
      count: templates.length,
      templates
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/suggestions
 * Get template suggestions based on server configuration
 */
router.get('/suggestions', async (req, res, next) => {
  try {
    const { serverType, modpack, modpackPlatform } = req.query;

    const suggestions = await composeTemplateService.getSuggestions({
      serverType,
      modpack,
      modpackPlatform
    });

    res.json({
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await composeTemplateService.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        error: { message: 'Template not found', code: 'NotFound' }
      });
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id/env
 * Get environment variable reference for a template
 */
router.get('/:id/env', async (req, res, next) => {
  try {
    const { id } = req.params;

    const envVars = await composeTemplateService.getTemplateEnvVars(id);

    if (!envVars) {
      return res.status(404).json({
        error: { message: 'Template not found', code: 'NotFound' }
      });
    }

    res.json({ envVars });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/:id/generate
 * Generate a compose configuration from a template with overrides
 */
router.post('/:id/generate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const overrides = req.body;

    const result = await composeTemplateService.generateFromTemplate(id, overrides);

    logger.info(`Generated compose config from template: ${id}`);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: { message: error.message, code: 'NotFound' }
      });
    }
    next(error);
  }
});

/**
 * POST /api/templates/cache/clear
 * Clear the template cache (admin operation)
 */
router.post('/cache/clear', async (req, res, next) => {
  try {
    composeTemplateService.clearCache();
    logger.info('Template cache cleared');
    res.json({ message: 'Cache cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;
