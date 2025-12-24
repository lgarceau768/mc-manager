import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

class AuthService {
  constructor() {
    // Auth can be disabled for development or single-user setups
    this.enabled = process.env.ENABLE_AUTH === 'true';
    this.jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

    // Config-based authentication (perfect for self-hosted)
    this.username = process.env.AUTH_USERNAME || 'admin';
    this.passwordHash = process.env.AUTH_PASSWORD_HASH || null;

    // If no password hash is set, generate one from AUTH_PASSWORD env var
    if (!this.passwordHash && process.env.AUTH_PASSWORD) {
      this.passwordHash = bcrypt.hashSync(process.env.AUTH_PASSWORD, 10);
    }

    // Default password for development (INSECURE - only use in dev!)
    if (!this.passwordHash && process.env.NODE_ENV !== 'production') {
      logger.warn('No auth password set! Using default password "admin" (INSECURE - for development only!)');
      this.passwordHash = bcrypt.hashSync('admin', 10);
    }

    if (this.enabled) {
      logger.info('Authentication is ENABLED');
      if (!this.passwordHash) {
        logger.error('AUTH ENABLED but no password configured! Set AUTH_PASSWORD or AUTH_PASSWORD_HASH');
      }
    } else {
      logger.info('Authentication is DISABLED');
    }
  }

  /**
   * Check if authentication is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Authenticate user with username and password
   */
  async login(username, password) {
    if (!this.enabled) {
      // If auth is disabled, accept any login
      return this.generateToken({ username: 'guest' });
    }

    if (!this.passwordHash) {
      throw new ValidationError('Authentication not properly configured');
    }

    // Check username
    if (username !== this.username) {
      logger.warn(`Failed login attempt for username: ${username}`);
      throw new ValidationError('Invalid username or password');
    }

    // Check password
    const isValid = await bcrypt.compare(password, this.passwordHash);
    if (!isValid) {
      logger.warn(`Failed login attempt for username: ${username}`);
      throw new ValidationError('Invalid username or password');
    }

    logger.info(`Successful login for user: ${username}`);

    // Generate JWT token
    return this.generateToken({ username });
  }

  /**
   * Generate JWT token
   */
  generateToken(payload) {
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });

    return {
      token,
      expiresIn: this.jwtExpiresIn,
      user: payload
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      logger.warn(`Invalid token: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Hash a password (utility for generating password hashes)
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
}

// Export singleton instance
export default new AuthService();
