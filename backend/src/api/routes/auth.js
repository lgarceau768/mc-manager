import express from 'express';
import authService from '../../services/authService.js';
import logger from '../../utils/logger.js';
import { asyncHandler } from '../../utils/errors.js';
import Joi from 'joi';
import { ValidationError } from '../../utils/errors.js';

const router = express.Router();

/**
 * Validation schema for login
 */
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

/**
 * Check authentication status
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    enabled: authService.isEnabled(),
    authenticated: req.user ? true : false,
    user: req.user || null
  });
});

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  const { error } = loginSchema.validate({ username, password });
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  logger.info(`Login attempt for user: ${username}`);

  // Authenticate
  const result = await authService.login(username, password);

  res.json({
    success: true,
    message: 'Login successful',
    ...result
  });
}));

/**
 * Logout (client-side token removal, this is just a placeholder)
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  logger.info(`Logout for user: ${req.user?.username || 'unknown'}`);

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Not authenticated',
        code: 'Unauthorized'
      }
    });
  }

  res.json({
    success: true,
    user: req.user
  });
});

export default router;
