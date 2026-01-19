import Server from '../models/Server.js';
import dockerService from './dockerService.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

class PlayerService {
  /**
   * Get online players for a server
   * @param {string} serverId - Server ID
   * @returns {Object} Player information
   */
  async getOnlinePlayers(serverId) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    if (server.status !== 'running') {
      return {
        online: 0,
        max: 0,
        players: [],
        serverStatus: server.status
      };
    }

    if (!server.container_id) {
      throw new ValidationError('Server has no associated container');
    }

    try {
      // Execute the 'list' command via RCON
      const output = await dockerService.executeCommand(server.container_id, 'list');

      // Parse the output
      // Format: "There are X of a max of Y players online: player1, player2, ..."
      // or "There are X of a max Y players online:" (no players)
      const result = this.parseListOutput(output);

      logger.debug(`Players on ${serverId}: ${result.online}/${result.max}`);

      return {
        ...result,
        serverStatus: server.status
      };
    } catch (error) {
      logger.error(`Failed to get players for server ${serverId}: ${error.message}`);

      // If RCON fails, return empty but don't throw
      return {
        online: 0,
        max: 0,
        players: [],
        serverStatus: server.status,
        error: 'Could not retrieve player list'
      };
    }
  }

  /**
   * Parse the output of the 'list' command
   * @param {string} output - Raw RCON output
   * @returns {Object} Parsed player information
   */
  parseListOutput(output) {
    const result = {
      online: 0,
      max: 0,
      players: []
    };

    if (!output || typeof output !== 'string') {
      return result;
    }

    // Clean up output (remove ANSI codes, extra whitespace)
    const cleanOutput = output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      .replace(/[\r\n]+/g, ' ')       // Replace newlines with spaces
      .trim();

    // Try to match the standard format
    // "There are X of a max of Y players online: player1, player2"
    // Some servers use: "There are X/Y players online: player1, player2"
    const fullMatch = cleanOutput.match(
      /There are (\d+) (?:of a max of |\/|of )(\d+) players? online[:\s]*(.*)?/i
    );

    if (fullMatch) {
      result.online = parseInt(fullMatch[1], 10);
      result.max = parseInt(fullMatch[2], 10);

      // Parse player list if present
      const playersPart = fullMatch[3];
      if (playersPart && playersPart.trim()) {
        result.players = playersPart
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0 && p !== ':');
      }
    } else {
      // Try simpler pattern
      const simpleMatch = cleanOutput.match(/(\d+)\/(\d+)/);
      if (simpleMatch) {
        result.online = parseInt(simpleMatch[1], 10);
        result.max = parseInt(simpleMatch[2], 10);
      }
    }

    return result;
  }

  /**
   * Execute a command on a server (for future expansion)
   * @param {string} serverId - Server ID
   * @param {string} command - Command to execute
   * @returns {string} Command output
   */
  async executeCommand(serverId, command) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    if (server.status !== 'running') {
      throw new ValidationError('Server is not running');
    }

    if (!server.container_id) {
      throw new ValidationError('Server has no associated container');
    }

    // Validate command (basic whitelist for safety)
    const allowedCommands = ['list', 'tps', 'time query'];
    const isAllowed = allowedCommands.some(cmd =>
      command.toLowerCase().startsWith(cmd)
    );

    if (!isAllowed) {
      throw new ValidationError('Command not allowed via this endpoint');
    }

    const output = await dockerService.executeCommand(server.container_id, command);
    return output;
  }

  /**
   * Execute a player action (kick, ban, op, deop, tp)
   * @param {string} serverId - Server ID
   * @param {string} playerName - Player name
   * @param {string} action - Action to execute
   * @returns {Object} Result of the action
   */
  async executePlayerAction(serverId, playerName, action) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    if (server.status !== 'running') {
      throw new ValidationError('Server is not running');
    }

    if (!server.container_id) {
      throw new ValidationError('Server has no associated container');
    }

    // Validate player name (alphanumeric and underscores only, 1-16 chars)
    if (!/^[a-zA-Z0-9_]{1,16}$/.test(playerName)) {
      throw new ValidationError('Invalid player name');
    }

    // Map action to Minecraft command
    const actionCommands = {
      kick: `kick ${playerName}`,
      ban: `ban ${playerName}`,
      op: `op ${playerName}`,
      deop: `deop ${playerName}`,
      tp: `tp @a ${playerName}`  // Teleport all players to target player
    };

    const command = actionCommands[action];
    if (!command) {
      throw new ValidationError(`Invalid action: ${action}. Allowed: ${Object.keys(actionCommands).join(', ')}`);
    }

    try {
      const output = await dockerService.executeCommand(server.container_id, command);
      logger.info(`Executed player action ${action} on ${playerName} for server ${serverId}`);

      // Generate user-friendly message
      const messages = {
        kick: `Player ${playerName} has been kicked from the server`,
        ban: `Player ${playerName} has been banned from the server`,
        op: `Player ${playerName} is now an operator`,
        deop: `Player ${playerName} is no longer an operator`,
        tp: `Teleported all players to ${playerName}`
      };

      return {
        success: true,
        action,
        player: playerName,
        message: messages[action],
        output: output.trim()
      };
    } catch (error) {
      logger.error(`Failed to execute player action ${action} on ${playerName}: ${error.message}`);
      throw new ValidationError(`Failed to execute ${action}: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new PlayerService();
