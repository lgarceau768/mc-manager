import Docker from 'dockerode';
import logger from '../utils/logger.js';
import { DockerError } from '../utils/errors.js';

class DockerService {
  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    });
  }

  /**
   * Create a new Minecraft server container
   */
  async createContainer({ serverId, name, version, port, memory, cpuLimit, volumePath, volumeHostPath, type }) {
    try {
      logger.info(`Creating container for server: ${name}`);
      const hostDataPath = volumeHostPath || volumePath;

      // Parse memory to get limit in bytes (slightly higher than JVM heap)
      const memoryLimit = this.parseMemoryToBytes(memory) * 1.5;
      const serverType = (type || 'PAPER').toUpperCase();

      const containerConfig = {
        name: `mc-${serverId}`,
        Image: 'itzg/minecraft-server:latest',
        Env: [
          'EULA=TRUE',
          `TYPE=${serverType}`,
          `VERSION=${version}`,
          `MEMORY=${memory}`,
          `SERVER_NAME=${name}`,
          'ONLINE_MODE=TRUE',
          `SERVER_PORT=${port}`
        ],
        ExposedPorts: {
          '25565/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '25565/tcp': [{ HostPort: port.toString() }]
          },
          Binds: [`${hostDataPath}:/data`],
          RestartPolicy: { Name: 'unless-stopped' },
          Memory: memoryLimit,
          ...(cpuLimit && { NanoCpus: cpuLimit * 1e9 })
        }
      };

      const container = await this.docker.createContainer(containerConfig);
      logger.info(`Container created successfully: ${container.id}`);

      return container.id;
    } catch (error) {
      logger.error(`Failed to create container: ${error.message}`);
      throw new DockerError(`Failed to create container: ${error.message}`, error);
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId) {
    try {
      logger.info(`Starting container: ${containerId}`);
      const container = this.docker.getContainer(containerId);
      await container.start();
      logger.info(`Container started successfully: ${containerId}`);
    } catch (error) {
      if (error.statusCode === 304) {
        logger.warn(`Container already running: ${containerId}`);
        return;
      }
      logger.error(`Failed to start container: ${error.message}`);
      throw new DockerError(`Failed to start container: ${error.message}`, error);
    }
  }

  /**
   * Stop a container gracefully
   */
  async stopContainer(containerId, timeout = 30) {
    try {
      logger.info(`Stopping container: ${containerId}`);

      // Try to execute save-all command before stopping
      try {
        await this.execInContainer(containerId, ['rcon-cli', 'save-all', 'flush']);
        logger.info('Executed save-all command');
        // Wait a bit for save to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (execError) {
        logger.warn(`Could not execute save-all: ${execError.message}`);
      }

      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
      logger.info(`Container stopped successfully: ${containerId}`);
    } catch (error) {
      if (error.statusCode === 304) {
        logger.warn(`Container already stopped: ${containerId}`);
        return;
      }
      logger.error(`Failed to stop container: ${error.message}`);
      throw new DockerError(`Failed to stop container: ${error.message}`, error);
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId) {
    try {
      logger.info(`Restarting container: ${containerId}`);
      await this.stopContainer(containerId);
      await this.startContainer(containerId);
      logger.info(`Container restarted successfully: ${containerId}`);
    } catch (error) {
      logger.error(`Failed to restart container: ${error.message}`);
      throw new DockerError(`Failed to restart container: ${error.message}`, error);
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId) {
    try {
      logger.info(`Removing container: ${containerId}`);
      const container = this.docker.getContainer(containerId);

      // Stop if running
      try {
        await container.stop();
      } catch (stopError) {
        if (stopError.statusCode !== 304) {
          logger.warn(`Error stopping container before removal: ${stopError.message}`);
        }
      }

      await container.remove();
      logger.info(`Container removed successfully: ${containerId}`);
    } catch (error) {
      if (error.statusCode === 404) {
        logger.warn(`Container not found: ${containerId}`);
        return;
      }
      logger.error(`Failed to remove container: ${error.message}`);
      throw new DockerError(`Failed to remove container: ${error.message}`, error);
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      return {
        cpuUsage: cpuUsage.toFixed(2),
        memoryUsage: this.formatBytes(memoryUsage),
        memoryLimit: this.formatBytes(memoryLimit),
        memoryPercent: memoryPercent.toFixed(2)
      };
    } catch (error) {
      logger.error(`Failed to get container stats: ${error.message}`);
      throw new DockerError(`Failed to get container stats: ${error.message}`, error);
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId, tail = 100) {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true
      });

      return logs.toString('utf8');
    } catch (error) {
      logger.error(`Failed to get container logs: ${error.message}`);
      throw new DockerError(`Failed to get container logs: ${error.message}`, error);
    }
  }

  /**
   * Attach to container logs stream
   */
  async attachToContainer(containerId, onData) {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true
      });

      stream.on('data', (chunk) => {
        // Docker adds 8-byte header, remove it
        const log = chunk.toString('utf8').substring(8);
        onData(log);
      });

      return stream;
    } catch (error) {
      logger.error(`Failed to attach to container: ${error.message}`);
      throw new DockerError(`Failed to attach to container: ${error.message}`, error);
    }
  }

  /**
   * Execute command in container
   */
  async execInContainer(containerId, cmd) {
    try {
      const container = this.docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true
      });

      const stream = await exec.start();
      return new Promise((resolve, reject) => {
        let output = '';

        stream.on('data', (chunk) => {
          output += chunk.toString('utf8');
        });

        stream.on('end', () => {
          resolve(output.trim());
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Failed to execute command in container: ${error.message}`);
      throw new DockerError(`Failed to execute command: ${error.message}`, error);
    }
  }

  /**
   * Execute RCON command in Minecraft server container
   */
  async executeCommand(containerId, command) {
    try {
      logger.info(`Executing RCON command: ${command}`);
      return await this.execInContainer(containerId, ['rcon-cli', command]);
    } catch (error) {
      logger.error(`Failed to execute RCON command: ${error.message}`);
      throw new DockerError(`Failed to execute RCON command: ${error.message}`, error);
    }
  }

  /**
   * Check if container is running
   */
  async isContainerRunning(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw new DockerError(`Failed to check container status: ${error.message}`, error);
    }
  }

  /**
   * Get detailed container status including error states
   */
  async getContainerStatus(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      const state = info.State;

      let status = 'stopped';
      let error = null;
      let exitCode = null;
      let health = null;

      if (state.Running) {
        status = 'running';
        // Check health status if available
        if (state.Health) {
          health = state.Health.Status; // 'healthy', 'unhealthy', 'starting'
          if (state.Health.Status === 'unhealthy') {
            status = 'unhealthy';
            // Get last health check log
            const logs = state.Health.Log || [];
            if (logs.length > 0) {
              const lastLog = logs[logs.length - 1];
              error = lastLog.Output?.trim() || 'Health check failed';
            }
          }
        }
      } else if (state.Restarting) {
        status = 'restarting';
      } else if (state.Dead) {
        status = 'error';
        error = 'Container is dead';
        exitCode = state.ExitCode;
      } else if (state.ExitCode !== 0) {
        status = 'error';
        exitCode = state.ExitCode;
        error = state.Error || `Container exited with code ${state.ExitCode}`;
      } else if (state.OOMKilled) {
        status = 'error';
        error = 'Container was killed due to out of memory';
        exitCode = state.ExitCode;
      }

      return {
        status,
        running: state.Running,
        error,
        exitCode,
        health,
        startedAt: state.StartedAt,
        finishedAt: state.FinishedAt,
        restartCount: info.RestartCount || 0
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          status: 'stopped',
          running: false,
          error: null,
          exitCode: null,
          health: null
        };
      }
      throw new DockerError(`Failed to get container status: ${error.message}`, error);
    }
  }

  /**
   * Get container's IP address
   */
  async getContainerIP(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();

      // Get IP from the first network the container is connected to
      const networks = info.NetworkSettings.Networks;
      const networkNames = Object.keys(networks);

      if (networkNames.length === 0) {
        logger.warn(`Container ${containerId} has no networks`);
        return null;
      }

      const firstNetwork = networks[networkNames[0]];
      const ipAddress = firstNetwork.IPAddress;

      logger.debug(`Container ${containerId} IP: ${ipAddress}`);
      return ipAddress || null;
    } catch (error) {
      if (error.statusCode === 404) {
        logger.warn(`Container ${containerId} not found when getting IP`);
        return null;
      }
      logger.error(`Failed to get container IP: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse memory string to bytes
   */
  parseMemoryToBytes(memory) {
    const match = memory.match(/^([0-9]+)(G|M)$/);
    if (!match) {
      throw new Error('Invalid memory format');
    }

    const amount = parseInt(match[1]);
    const unit = match[2];

    return unit === 'G' ? amount * 1024 * 1024 * 1024 : amount * 1024 * 1024;
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Export singleton instance
export default new DockerService();
