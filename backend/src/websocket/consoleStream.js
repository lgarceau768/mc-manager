import { WebSocketServer } from 'ws';
import url from 'url';
import Server from '../models/Server.js';
import dockerService from '../services/dockerService.js';
import logger from '../utils/logger.js';

class ConsoleStreamManager {
  constructor() {
    this.wss = null;
    this.activeStreams = new Map(); // Map of serverId -> Set of WebSocket clients
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws/console' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    try {
      // Parse server ID from query string
      const queryParams = url.parse(req.url, true).query;
      const serverId = queryParams.serverId;

      if (!serverId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Server ID required' }));
        ws.close();
        return;
      }

      // Validate server exists
      const server = Server.findById(serverId);
      if (!server) {
        ws.send(JSON.stringify({ type: 'error', message: 'Server not found' }));
        ws.close();
        return;
      }

      logger.info(`WebSocket client connected for server: ${serverId}`);

      // Track this connection
      if (!this.activeStreams.has(serverId)) {
        this.activeStreams.set(serverId, new Set());
      }
      this.activeStreams.get(serverId).add(ws);

      // Send connection success message
      ws.send(JSON.stringify({
        type: 'connected',
        serverId,
        serverName: server.name,
        status: server.status
      }));

      // If server is running, attach to logs
      let logStream = null;
      if (server.status === 'running' && server.container_id) {
        try {
          logStream = await dockerService.attachToContainer(
            server.container_id,
            (log) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  type: 'log',
                  timestamp: new Date().toISOString(),
                  message: log.trim()
                }));
              }
            }
          );

          logger.info(`Attached to container logs for server: ${serverId}`);
        } catch (error) {
          logger.error(`Failed to attach to container logs: ${error.message}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to attach to server logs'
          }));
        }
      } else {
        ws.send(JSON.stringify({
          type: 'status',
          message: `Server is ${server.status}. Start the server to view logs.`
        }));
      }

      // Handle messages from client (future: commands)
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, serverId, message);
        } catch (error) {
          logger.error(`Failed to handle WebSocket message: ${error.message}`);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to handle console message'
            }));
          }
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected from server: ${serverId}`);

        // Remove from active streams
        const streams = this.activeStreams.get(serverId);
        if (streams) {
          streams.delete(ws);
          if (streams.size === 0) {
            this.activeStreams.delete(serverId);
          }
        }

        // Close log stream
        if (logStream) {
          try {
            logStream.destroy();
          } catch (error) {
            logger.warn(`Error closing log stream: ${error.message}`);
          }
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for server ${serverId}: ${error.message}`);
      });

    } catch (error) {
      logger.error(`Error handling WebSocket connection: ${error.message}`);
      ws.send(JSON.stringify({ type: 'error', message: 'Connection error' }));
      ws.close();
    }
  }

  /**
   * Handle messages from client
   */
  async handleClientMessage(ws, serverId, message) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'command':
        await this.executeCommand(ws, serverId, message.command);
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Execute a console command via Docker exec (rcon-cli)
   */
  async executeCommand(ws, serverId, command) {
    if (!command || typeof command !== 'string' || !command.trim()) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Command is required'
      }));
      return;
    }

    const server = Server.findById(serverId);
    if (!server) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server not found'
      }));
      return;
    }

    if (server.status !== 'running' || !server.container_id) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server must be running to execute commands'
      }));
      return;
    }

    try {
      const output = await dockerService.execInContainer(server.container_id, ['rcon-cli', command]);
      const timestamp = new Date().toISOString();

      ws.send(JSON.stringify({
        type: 'command_result',
        success: true,
        command,
        output,
        timestamp
      }));

      if (output) {
        this.broadcastToServer(serverId, {
          type: 'log',
          timestamp,
          message: `[RCON] ${output}`
        });
      }
    } catch (error) {
      logger.error(`Failed to execute command for server ${serverId}: ${error.message}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to execute command: ${error.message}`
      }));
    }
  }

  /**
   * Broadcast message to all clients connected to a server
   */
  broadcastToServer(serverId, message) {
    const streams = this.activeStreams.get(serverId);
    if (!streams) return;

    const messageStr = JSON.stringify(message);
    streams.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Get number of active connections
   */
  getActiveConnectionsCount() {
    let count = 0;
    this.activeStreams.forEach((streams) => {
      count += streams.size;
    });
    return count;
  }
}

// Export singleton instance
export default new ConsoleStreamManager();
