import Server from '../models/Server.js';
import logger from '../utils/logger.js';
import { ConflictError } from '../utils/errors.js';

class PortService {
  constructor() {
    this.PORT_RANGE_START = parseInt(process.env.PORT_RANGE_START || '25565');
    this.PORT_RANGE_END = parseInt(process.env.PORT_RANGE_END || '25600');
  }

  /**
   * Get the next available port
   */
  getNextAvailablePort() {
    const usedPorts = Server.getUsedPorts();
    logger.debug(`Used ports: ${usedPorts.join(', ')}`);

    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      if (!usedPorts.includes(port)) {
        logger.info(`Found available port: ${port}`);
        return port;
      }
    }

    throw new ConflictError('No available ports in the configured range');
  }

  /**
   * Check if a specific port is available
   */
  isPortAvailable(port) {
    if (port < this.PORT_RANGE_START || port > this.PORT_RANGE_END) {
      logger.warn(`Port ${port} is outside allowed range`);
      return false;
    }

    const usedPorts = Server.getUsedPorts();
    const available = !usedPorts.includes(port);

    logger.debug(`Port ${port} availability: ${available}`);
    return available;
  }

  /**
   * Validate port is within range
   */
  validatePort(port) {
    if (!Number.isInteger(port)) {
      throw new Error('Port must be an integer');
    }

    if (port < this.PORT_RANGE_START || port > this.PORT_RANGE_END) {
      throw new Error(
        `Port must be between ${this.PORT_RANGE_START} and ${this.PORT_RANGE_END}`
      );
    }

    if (!this.isPortAvailable(port)) {
      throw new ConflictError(`Port ${port} is already in use`);
    }

    return true;
  }

  /**
   * Get all used ports
   */
  getUsedPorts() {
    return Server.getUsedPorts();
  }

  /**
   * Get port range info
   */
  getPortRangeInfo() {
    const usedPorts = this.getUsedPorts();
    const totalPorts = this.PORT_RANGE_END - this.PORT_RANGE_START + 1;
    const availablePorts = totalPorts - usedPorts.length;

    return {
      start: this.PORT_RANGE_START,
      end: this.PORT_RANGE_END,
      total: totalPorts,
      used: usedPorts.length,
      available: availablePorts,
      usedPorts
    };
  }
}

// Export singleton instance
export default new PortService();
