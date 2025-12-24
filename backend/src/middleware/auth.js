import authService from '../services/authService.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Protects routes when authentication is enabled
 */
export const authMiddleware = (req, res, next) => {
  // If auth is disabled, allow all requests
  if (!authService.isEnabled()) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token) {
    logger.warn(`Unauthorized request to ${req.method} ${req.path} - No token provided`);
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'Unauthorized'
      }
    });
  }

  // Verify token
  const decoded = authService.verifyToken(token);

  if (!decoded) {
    logger.warn(`Unauthorized request to ${req.method} ${req.path} - Invalid token`);
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        code: 'Unauthorized'
      }
    });
  }

  // Attach user info to request
  req.user = decoded;

  next();
};

/**
 * Optional auth middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuthMiddleware = (req, res, next) => {
  // If auth is disabled, continue
  if (!authService.isEnabled()) {
    return next();
  }

  // Try to extract and verify token
  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
};
