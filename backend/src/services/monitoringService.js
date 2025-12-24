import dockerService from './dockerService.js';
import Server from '../models/Server.js';
import logger from '../utils/logger.js';

class MonitoringService {
  constructor() {
    this.metricsHistory = new Map(); // serverId -> metrics array
    this.maxHistorySize = 60; // Keep last 60 data points (for 5-minute window at 5s intervals)
  }

  /**
   * Get current stats for a server
   */
  async getServerStats(serverId) {
    try {
      const server = Server.findById(serverId);
      if (!server) {
        throw new Error('Server not found');
      }

      if (server.status !== 'running') {
        return {
          status: server.status,
          uptime: null,
          cpuUsage: 0,
          memoryUsage: 0,
          memoryLimit: 0,
          memoryPercent: 0,
          players: { online: 0, max: 0 },
          tps: null
        };
      }

      // Get Docker stats
      const stats = await dockerService.getContainerStats(server.container_id);

      // Try to get TPS and player count via RCON
      let players = { online: 0, max: 0 };
      let tps = null;

      try {
        const listOutput = await dockerService.executeCommand(server.container_id, 'list');
        const playerMatch = listOutput.match(/There are (\d+) of a max of (\d+) players online/);
        if (playerMatch) {
          players = {
            online: parseInt(playerMatch[1]),
            max: parseInt(playerMatch[2])
          };
        }
      } catch (error) {
        logger.warn(`Failed to get player list for server ${serverId}: ${error.message}`);
      }

      // Try to get TPS (Paper/Spigot servers)
      try {
        const tpsOutput = await dockerService.executeCommand(server.container_id, 'tps');
        const tpsMatch = tpsOutput.match(/TPS from last 1m.*?:\s*([\d.]+)/);
        if (tpsMatch) {
          tps = parseFloat(tpsMatch[1]);
        }
      } catch (error) {
        // TPS command might not be available on all server types
        logger.debug(`TPS not available for server ${serverId}`);
      }

      const metrics = {
        timestamp: Date.now(),
        status: server.status,
        cpuUsage: parseFloat(stats.cpuUsage) || 0,
        memoryUsage: stats.memoryUsage,
        memoryLimit: stats.memoryLimit,
        memoryPercent: parseFloat(stats.memoryPercent) || 0,
        players,
        tps
      };

      // Store in history
      this.addMetricsToHistory(serverId, metrics);

      return metrics;
    } catch (error) {
      logger.error(`Failed to get server stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add metrics to history
   */
  addMetricsToHistory(serverId, metrics) {
    if (!this.metricsHistory.has(serverId)) {
      this.metricsHistory.set(serverId, []);
    }

    const history = this.metricsHistory.get(serverId);
    history.push(metrics);

    // Keep only recent metrics
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get metrics history for a server
   */
  getMetricsHistory(serverId, limit = 60) {
    const history = this.metricsHistory.get(serverId) || [];
    return history.slice(-limit);
  }

  /**
   * Get aggregated stats for all servers
   */
  async getAllServersStats() {
    try {
      const servers = Server.findAll();
      const stats = await Promise.all(
        servers.map(async (server) => {
          try {
            const metrics = await this.getServerStats(server.id);
            return {
              serverId: server.id,
              serverName: server.name,
              ...metrics
            };
          } catch (error) {
            logger.error(`Failed to get stats for server ${server.id}: ${error.message}`);
            return {
              serverId: server.id,
              serverName: server.name,
              status: 'error',
              error: error.message
            };
          }
        })
      );

      return stats;
    } catch (error) {
      logger.error(`Failed to get all servers stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system summary
   */
  async getSystemSummary() {
    try {
      const servers = Server.findAll();
      const totalServers = servers.length;
      const runningServers = servers.filter(s => s.status === 'running').length;
      const stoppedServers = servers.filter(s => s.status === 'stopped').length;

      // Get total resource usage from running servers
      let totalCpu = 0;
      let totalMemory = 0;
      let totalPlayers = 0;

      for (const server of servers) {
        if (server.status === 'running') {
          try {
            const stats = await this.getServerStats(server.id);
            totalCpu += stats.cpuUsage || 0;
            totalMemory += parseInt(stats.memoryUsage?.replace(/[^\d]/g, '') || 0);
            totalPlayers += stats.players?.online || 0;
          } catch (error) {
            logger.warn(`Failed to get stats for server ${server.id}`);
          }
        }
      }

      return {
        totalServers,
        runningServers,
        stoppedServers,
        totalCpu: totalCpu.toFixed(2),
        totalMemory: this.formatBytes(totalMemory * 1024 * 1024),
        totalPlayers
      };
    } catch (error) {
      logger.error(`Failed to get system summary: ${error.message}`);
      throw error;
    }
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

  /**
   * Clear metrics history for a server
   */
  clearHistory(serverId) {
    this.metricsHistory.delete(serverId);
  }

  /**
   * Clear all metrics history
   */
  clearAllHistory() {
    this.metricsHistory.clear();
  }
}

// Export singleton instance
export default new MonitoringService();
