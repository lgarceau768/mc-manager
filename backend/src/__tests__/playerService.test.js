import { jest } from '@jest/globals';

// Mock Server model
jest.unstable_mockModule('../models/Server.js', () => ({
  default: {
    findById: jest.fn()
  }
}));

// Mock dockerService
jest.unstable_mockModule('../services/dockerService.js', () => ({
  default: {
    executeCommand: jest.fn()
  }
}));

// Mock logger
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('PlayerService', () => {
  let playerService;
  let Server;
  let dockerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    Server = (await import('../models/Server.js')).default;
    dockerService = (await import('../services/dockerService.js')).default;

    const module = await import('../services/playerService.js');
    playerService = module.default;
  });

  describe('parseListOutput', () => {
    it('should parse standard format with players', () => {
      const output = 'There are 3 of a max of 20 players online: Steve, Alex, Notch';
      const result = playerService.parseListOutput(output);

      expect(result.online).toBe(3);
      expect(result.max).toBe(20);
      expect(result.players).toEqual(['Steve', 'Alex', 'Notch']);
    });

    it('should parse standard format with no players', () => {
      const output = 'There are 0 of a max of 20 players online:';
      const result = playerService.parseListOutput(output);

      expect(result.online).toBe(0);
      expect(result.max).toBe(20);
      expect(result.players).toEqual([]);
    });

    it('should parse slash format', () => {
      const output = 'There are 2/10 players online: Player1, Player2';
      const result = playerService.parseListOutput(output);

      expect(result.online).toBe(2);
      expect(result.max).toBe(10);
    });

    it('should handle empty output', () => {
      const result = playerService.parseListOutput('');

      expect(result.online).toBe(0);
      expect(result.max).toBe(0);
      expect(result.players).toEqual([]);
    });

    it('should handle null output', () => {
      const result = playerService.parseListOutput(null);

      expect(result.online).toBe(0);
      expect(result.max).toBe(0);
      expect(result.players).toEqual([]);
    });

    it('should clean ANSI codes from output', () => {
      const output = '\x1b[32mThere are 1 of a max of 20 players online: Steve\x1b[0m';
      const result = playerService.parseListOutput(output);

      expect(result.online).toBe(1);
      expect(result.max).toBe(20);
      expect(result.players).toEqual(['Steve']);
    });
  });

  describe('executePlayerAction', () => {
    const mockServer = {
      id: 'test-server-id',
      name: 'TestServer',
      status: 'running',
      container_id: 'container-123'
    };

    it('should execute kick action successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue('Kicked Steve from the game');

      const result = await playerService.executePlayerAction(
        'test-server-id',
        'Steve',
        'kick'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('kick');
      expect(result.player).toBe('Steve');
      expect(result.message).toContain('kicked');
      expect(dockerService.executeCommand).toHaveBeenCalledWith(
        'container-123',
        'kick Steve'
      );
    });

    it('should execute ban action successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue('Banned Steve');

      const result = await playerService.executePlayerAction(
        'test-server-id',
        'Steve',
        'ban'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('ban');
      expect(dockerService.executeCommand).toHaveBeenCalledWith(
        'container-123',
        'ban Steve'
      );
    });

    it('should execute op action successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue('Made Steve a server operator');

      const result = await playerService.executePlayerAction(
        'test-server-id',
        'Steve',
        'op'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('op');
      expect(result.message).toContain('operator');
      expect(dockerService.executeCommand).toHaveBeenCalledWith(
        'container-123',
        'op Steve'
      );
    });

    it('should execute deop action successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue('Made Steve no longer a server operator');

      const result = await playerService.executePlayerAction(
        'test-server-id',
        'Steve',
        'deop'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('deop');
      expect(dockerService.executeCommand).toHaveBeenCalledWith(
        'container-123',
        'deop Steve'
      );
    });

    it('should execute tp action successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue('Teleported players');

      const result = await playerService.executePlayerAction(
        'test-server-id',
        'Steve',
        'tp'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('tp');
      expect(result.message).toContain('Teleported');
      expect(dockerService.executeCommand).toHaveBeenCalledWith(
        'container-123',
        'tp @a Steve'
      );
    });

    it('should throw error for non-existent server', async () => {
      Server.findById.mockReturnValue(null);

      await expect(
        playerService.executePlayerAction('invalid-id', 'Steve', 'kick')
      ).rejects.toThrow('Server not found');
    });

    it('should throw error when server is not running', async () => {
      Server.findById.mockReturnValue({ ...mockServer, status: 'stopped' });

      await expect(
        playerService.executePlayerAction('test-server-id', 'Steve', 'kick')
      ).rejects.toThrow('Server is not running');
    });

    it('should throw error for invalid player name', async () => {
      Server.findById.mockReturnValue(mockServer);

      await expect(
        playerService.executePlayerAction('test-server-id', 'Steve!@#$', 'kick')
      ).rejects.toThrow('Invalid player name');
    });

    it('should throw error for player name too long', async () => {
      Server.findById.mockReturnValue(mockServer);

      await expect(
        playerService.executePlayerAction('test-server-id', 'ThisNameIsTooLongForMinecraft', 'kick')
      ).rejects.toThrow('Invalid player name');
    });

    it('should throw error for invalid action', async () => {
      Server.findById.mockReturnValue(mockServer);

      await expect(
        playerService.executePlayerAction('test-server-id', 'Steve', 'invalid')
      ).rejects.toThrow('Invalid action');
    });

    it('should throw error when server has no container', async () => {
      Server.findById.mockReturnValue({ ...mockServer, container_id: null });

      await expect(
        playerService.executePlayerAction('test-server-id', 'Steve', 'kick')
      ).rejects.toThrow('Server has no associated container');
    });
  });

  describe('getOnlinePlayers', () => {
    const mockServer = {
      id: 'test-server-id',
      name: 'TestServer',
      status: 'running',
      container_id: 'container-123'
    };

    it('should return player list when server is running', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockResolvedValue(
        'There are 2 of a max of 20 players online: Steve, Alex'
      );

      const result = await playerService.getOnlinePlayers('test-server-id');

      expect(result.online).toBe(2);
      expect(result.max).toBe(20);
      expect(result.players).toEqual(['Steve', 'Alex']);
      expect(result.serverStatus).toBe('running');
    });

    it('should return empty list when server is stopped', async () => {
      Server.findById.mockReturnValue({ ...mockServer, status: 'stopped' });

      const result = await playerService.getOnlinePlayers('test-server-id');

      expect(result.online).toBe(0);
      expect(result.players).toEqual([]);
      expect(result.serverStatus).toBe('stopped');
    });

    it('should return empty list with error when RCON fails', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.executeCommand.mockRejectedValue(new Error('RCON connection failed'));

      const result = await playerService.getOnlinePlayers('test-server-id');

      expect(result.online).toBe(0);
      expect(result.players).toEqual([]);
      expect(result.error).toBe('Could not retrieve player list');
    });
  });
});
