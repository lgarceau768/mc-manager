import { jest } from '@jest/globals';
import path from 'path';

// Mock dependencies
jest.unstable_mockModule('../models/Server.js', () => ({
  default: {
    findById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    delete: jest.fn()
  }
}));

jest.unstable_mockModule('../services/dockerService.js', () => ({
  default: {
    createContainer: jest.fn(),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    getContainerStatus: jest.fn(),
    getContainerStats: jest.fn(),
    getContainerIP: jest.fn(),
    isContainerRunning: jest.fn(),
    removeContainer: jest.fn()
  }
}));

jest.unstable_mockModule('../services/portService.js', () => ({
  default: {
    validatePort: jest.fn(),
    getNextAvailablePort: jest.fn().mockReturnValue(25565)
  }
}));

jest.unstable_mockModule('../services/notificationService.js', () => ({
  default: {
    notify: jest.fn().mockResolvedValue(undefined),
    deleteSettings: jest.fn()
  }
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockFs = {
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('# server.properties\nmotd=Test Server\nmax-players=20\n'),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  rmSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ isDirectory: () => true, size: 1000, mtimeMs: Date.now() }),
  unlinkSync: jest.fn(),
  copyFileSync: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  ...mockFs
}));

describe('ServerService', () => {
  let serverService;
  let Server;
  let dockerService;
  let notificationService;

  const mockServer = {
    id: 'test-server-id',
    name: 'TestServer',
    type: 'PAPER',
    version: '1.20.4',
    port: 25565,
    memory: '4G',
    cpu_limit: 2,
    status: 'stopped',
    container_id: 'old-container-123',
    volume_path: '/data/servers/test-server-id'
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    Server = (await import('../models/Server.js')).default;
    dockerService = (await import('../services/dockerService.js')).default;
    notificationService = (await import('../services/notificationService.js')).default;

    const module = await import('../services/serverService.js');
    serverService = module.default;
  });

  describe('recreateContainer', () => {
    it('should recreate container successfully', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.getContainerStatus.mockRejectedValue({ statusCode: 404 });
      dockerService.createContainer.mockResolvedValue('new-container-456');
      dockerService.getContainerIP.mockResolvedValue('192.168.1.100');

      const result = await serverService.recreateContainer('test-server-id');

      expect(result.containerRecreated).toBe(true);
      expect(dockerService.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'test-server-id',
          name: 'TestServer',
          version: '1.20.4',
          port: 25565,
          memory: '4G',
          cpuLimit: 2,
          type: 'PAPER'
        })
      );
      expect(Server.update).toHaveBeenCalledWith('test-server-id', {
        container_id: 'new-container-456',
        status: 'stopped'
      });
    });

    it('should throw error if server not found', async () => {
      Server.findById.mockReturnValue(null);

      await expect(
        serverService.recreateContainer('invalid-id')
      ).rejects.toThrow('Server not found');
    });

    it('should throw error if container still exists and is running', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.getContainerStatus.mockResolvedValue({
        running: true,
        status: 'running'
      });

      await expect(
        serverService.recreateContainer('test-server-id')
      ).rejects.toThrow('Container still exists');
    });
  });

  describe('checkContainerExists', () => {
    it('should return exists: true when container is found', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.getContainerStatus.mockResolvedValue({
        running: false,
        status: 'stopped'
      });

      const result = await serverService.checkContainerExists('test-server-id');

      expect(result.exists).toBe(true);
    });

    it('should return exists: false when container is not found', async () => {
      Server.findById.mockReturnValue(mockServer);
      dockerService.getContainerStatus.mockRejectedValue({ statusCode: 404 });

      const result = await serverService.checkContainerExists('test-server-id');

      expect(result.exists).toBe(false);
      expect(result.reason).toBe('container_not_found');
    });

    it('should return exists: false when no container_id', async () => {
      Server.findById.mockReturnValue({ ...mockServer, container_id: null });

      const result = await serverService.checkContainerExists('test-server-id');

      expect(result.exists).toBe(false);
      expect(result.reason).toBe('no_container_id');
    });

    it('should throw error if server not found', async () => {
      Server.findById.mockReturnValue(null);

      await expect(
        serverService.checkContainerExists('invalid-id')
      ).rejects.toThrow('Server not found');
    });
  });

  describe('startServer', () => {
    it('should send notification on successful start', async () => {
      const runningServer = { ...mockServer, status: 'stopped' };
      Server.findById
        .mockReturnValueOnce(runningServer)  // Initial check
        .mockReturnValueOnce({ ...runningServer, status: 'running' }); // After start
      dockerService.startContainer.mockResolvedValue(undefined);
      dockerService.isContainerRunning.mockResolvedValue(true);
      dockerService.getContainerIP.mockResolvedValue('192.168.1.100');

      await serverService.startServer('test-server-id');

      expect(notificationService.notify).toHaveBeenCalledWith(
        'test-server-id',
        'serverStart',
        expect.objectContaining({ serverName: 'TestServer' })
      );
    });

    it('should send error notification on start failure', async () => {
      const stoppedServer = { ...mockServer, status: 'stopped' };
      Server.findById.mockReturnValue(stoppedServer);
      dockerService.startContainer.mockRejectedValue(new Error('Container failed to start'));

      await expect(
        serverService.startServer('test-server-id')
      ).rejects.toThrow('Container failed to start');

      expect(notificationService.notify).toHaveBeenCalledWith(
        'test-server-id',
        'serverError',
        expect.objectContaining({
          serverName: 'TestServer',
          error: 'Container failed to start'
        })
      );
    });
  });

  describe('stopServer', () => {
    it('should send notification on successful stop', async () => {
      const runningServer = { ...mockServer, status: 'running' };
      Server.findById
        .mockReturnValueOnce(runningServer)
        .mockReturnValueOnce({ ...runningServer, status: 'stopped' });
      dockerService.stopContainer.mockResolvedValue(undefined);
      dockerService.getContainerIP.mockResolvedValue('192.168.1.100');

      await serverService.stopServer('test-server-id');

      expect(notificationService.notify).toHaveBeenCalledWith(
        'test-server-id',
        'serverStop',
        expect.objectContaining({ serverName: 'TestServer' })
      );
    });
  });
});
