import Joi from 'joi';
import { ValidationError } from './errors.js';

/**
 * Joi schemas for request validation
 */

export const createServerSchema = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(3)
    .max(32)
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Server name must contain only alphanumeric characters and hyphens',
      'string.min': 'Server name must be at least 3 characters',
      'string.max': 'Server name must not exceed 32 characters'
    }),

  version: Joi.string()
    .required()
    .messages({
      'any.required': 'Minecraft version is required'
    }),

  memory: Joi.string()
    .pattern(/^[1-9][0-9]*(G|M)$/)
    .required()
    .custom((value, helpers) => {
      const match = value.match(/^([1-9][0-9]*)(G|M)$/);
      if (!match) return helpers.error('string.pattern.base');

      const amount = parseInt(match[1]);
      const unit = match[2];

      // Convert to MB for validation
      const memoryMB = unit === 'G' ? amount * 1024 : amount;

      // Minimum 512MB, maximum 16GB
      if (memoryMB < 512 || memoryMB > 16384) {
        return helpers.error('any.invalid');
      }

      return value;
    })
    .messages({
      'string.pattern.base': 'Memory must be in format like "4G" or "2048M"',
      'any.invalid': 'Memory must be between 512M and 16G'
    }),

  type: Joi.string()
    .valid('PAPER', 'FABRIC', 'FORGE')
    .insensitive()
    .uppercase()
    .default('PAPER')
    .messages({
      'any.only': 'Server type must be one of Paper, Fabric, or Forge'
    }),

  cpuLimit: Joi.number()
    .min(0.5)
    .max(8.0)
    .optional()
    .messages({
      'number.min': 'CPU limit must be at least 0.5',
      'number.max': 'CPU limit must not exceed 8.0'
    })
,

  modpack: Joi.string().optional()
});

export const updateServerSettingsSchema = Joi.object({
  motd: Joi.string().max(100).allow('').optional(),
  maxPlayers: Joi.number().integer().min(1).max(500).optional(),
  difficulty: Joi.string()
    .valid('peaceful', 'easy', 'normal', 'hard')
    .insensitive()
    .optional(),
  pvp: Joi.boolean().optional(),
  whitelist: Joi.boolean().optional(),
  allowNether: Joi.boolean().optional(),
  hardcore: Joi.boolean().optional(),
  viewDistance: Joi.number().integer().min(2).max(32).optional()
}).min(1);

/**
 * Validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(errorMessage));
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};
