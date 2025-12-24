/**
 * Custom error classes for better error handling
 */

import logger from './logger.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class DockerError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DockerError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

/**
 * Async handler wrapper for Express routes
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Express error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;

  // Log error
  logger.error(`Error: ${err.message}`, {
    error: err.name,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.name || 'ServerError',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
