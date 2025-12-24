import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Server from '../models/Server.js';
import dockerService from './dockerService.js';
import portService from './portService.js';
import logger from '../utils/logger.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ServerService {
  constructor() {
    this.serversDataPath = process.env.SERVERS_DATA_PATH || path.join(__dirname, '../../data/servers');

    // Ensure servers data directory exists
    if (!fs.existsSync(this.serversDataPath)) {
      fs.mkdirSync(this.serversDataPath, { recursive: true });
    }
  }

  /**
   * Create a new server
   */
  async createServer({ name, version, memory, cpuLimit }) {
    try {
      logger.info(`Creating server: ${name}`);

      // Check if server with this name already exists
      const existingServer = Server.findByName(name);
      if (existingServer) {
        throw new ConflictError(`Server with name "${name}" already exists`);
      }

      // Generate unique ID
      const serverId = uuidv4();

      // Get next available port
      const port = portService.getNextAvailablePort();

      // Create volume directory
      const volumePath = path.join(this.serversDataPath, serverId);
      if (!fs.existsSync(volumePath)) {
        fs.mkdirSync(volumePath, { recursive: true });
      }

      // Create Docker container
      const containerId = await dockerService.createContainer({
        serverId,
        name,
        version,
        port,
        memory,
        cpuLimit,
        volumePath
      });

      // Save server to database
      const server = Server.create({
        id: serverId,
        name,
        type: 'PAPER',
        version,
        port,
        memory,
        cpuLimit,
        volumePath
      });

      // Update with container ID
      Server.update(serverId, { container_id: containerId });

      logger.info(`Server created successfully: ${serverId}`);
      return Server.findById(serverId);
    } catch (error) {
      logger.error(`Failed to create server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start a server
   */
  async startServer(serverId) {
    try {
      logger.info(`Starting server: ${serverId}`);

      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError(`Server not found: ${serverId}`);
      }

      if (server.status === 'running') {
        throw new ConflictError('Server is already running');
      }

      // Update status to starting
      Server.update(serverId, { status: 'starting' });

      // Start container
      await dockerService.startContainer(server.container_id);

      // Poll until container is fully running
      await this.waitForServerReady(server.container_id);

      // Update status to running
      Server.update(serverId, { status: 'running' });

      logger.info(`Server started successfully: ${serverId}`);
      return Server.findById(serverId);
    } catch (error) {
      // Revert status on error
      Server.update(serverId, { status: 'stopped' });
      logger.error(`Failed to start server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop a server
   */
  async stopServer(serverId) {
    try {
      logger.info(`Stopping server: ${serverId}`);

      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError(`Server not found: ${serverId}`);
      }

      if (server.status === 'stopped') {
        throw new ConflictError('Server is already stopped');
      }

      // Update status to stopping
      Server.update(serverId, { status: 'stopping' });

      // Stop container (gracefully with save-all)
      await dockerService.stopContainer(server.container_id);

      // Update status to stopped
      Server.update(serverId, { status: 'stopped' });

      logger.info(`Server stopped successfully: ${serverId}`);
      return Server.findById(serverId);
    } catch (error) {
      logger.error(`Failed to stop server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restart a server
   */
  async restartServer(serverId) {
    try {
      logger.info(`Restarting server: ${serverId}`);

      await this.stopServer(serverId);
      // Wait a bit before starting
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.startServer(serverId);

      logger.info(`Server restarted successfully: ${serverId}`);
      return Server.findById(serverId);
    } catch (error) {
      logger.error(`Failed to restart server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a server
   */
  async deleteServer(serverId) {
    try {
      logger.info(`Deleting server: ${serverId}`);

      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError(`Server not found: ${serverId}`);
      }

      // Stop server if running
      if (server.status === 'running') {
        await this.stopServer(serverId);
      }

      // Remove Docker container
      if (server.container_id) {
        await dockerService.removeContainer(server.container_id);
      }

      // Delete from database
      Server.delete(serverId);

      // Optionally archive or delete volume
      // For now, we'll leave the volume in place for data recovery
      logger.info(`Server deleted successfully (volume preserved): ${serverId}`);

      return { message: 'Server deleted successfully' };
    } catch (error) {
      logger.error(`Failed to delete server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get server details with runtime stats
   */
  async getServerDetails(serverId) {
    try {
      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError(`Server not found: ${serverId}`);
      }

      // If running, fetch stats
      if (server.status === 'running' && server.container_id) {
        try {
          const stats = await dockerService.getContainerStats(server.container_id);
          return { ...server, stats };
        } catch (error) {
          logger.warn(`Failed to get stats for server ${serverId}: ${error.message}`);
          return server;
        }
      }

      return server;
    } catch (error) {
      logger.error(`Failed to get server details: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all servers with optional stats
   */
  async listServers() {
    try {
      const servers = Server.findAll();

      // Fetch stats for running servers
      const serversWithStats = await Promise.all(
        servers.map(async (server) => {
          if (server.status === 'running' && server.container_id) {
            try {
              const stats = await dockerService.getContainerStats(server.container_id);
              return { ...server, stats };
            } catch (error) {
              logger.warn(`Failed to get stats for server ${server.id}: ${error.message}`);
              return server;
            }
          }
          return server;
        })
      );

      return serversWithStats;
    } catch (error) {
      logger.error(`Failed to list servers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get server logs
   */
  async getServerLogs(serverId, tail = 100) {
    try {
      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError(`Server not found: ${serverId}`);
      }

      if (!server.container_id) {
        throw new ValidationError('Server has no container');
      }

      const logs = await dockerService.getContainerLogs(server.container_id, tail);
      return logs;
    } catch (error) {
      logger.error(`Failed to get server logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForServerReady(containerId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      const isRunning = await dockerService.isContainerRunning(containerId);

      if (isRunning) {
        // Wait a bit more to ensure the server is fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Server failed to start within timeout');
  }
}

// Export singleton instance
export default new ServerService();
