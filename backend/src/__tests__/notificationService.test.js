import { jest } from '@jest/globals';

// Mock axios before importing the service
jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn()
  }
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
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

describe('NotificationService', () => {
  let notificationService;
  let axios;
  let fs;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked modules
    axios = (await import('axios')).default;
    fs = (await import('fs')).default;

    // Default mock implementations
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      discordWebhookUrl: 'https://discord.com/api/webhooks/123/abc',
      enabled: true,
      events: {
        serverStart: true,
        serverStop: true,
        serverError: true,
        backupComplete: true,
        backupFailed: true
      }
    }));

    // Re-import the service to get fresh instance
    const module = await import('../services/notificationService.js');
    notificationService = module.default;
  });

  describe('getDefaultSettings', () => {
    it('should return default settings with all expected fields', () => {
      const defaults = notificationService.getDefaultSettings();

      expect(defaults).toHaveProperty('discordWebhookUrl', '');
      expect(defaults).toHaveProperty('enabled', false);
      expect(defaults).toHaveProperty('events');
      expect(defaults.events).toHaveProperty('serverStart', true);
      expect(defaults.events).toHaveProperty('serverStop', true);
      expect(defaults.events).toHaveProperty('serverError', true);
      expect(defaults.events).toHaveProperty('playerJoin', false);
      expect(defaults.events).toHaveProperty('playerLeave', false);
      expect(defaults.events).toHaveProperty('backupComplete', true);
      expect(defaults.events).toHaveProperty('backupFailed', true);
    });
  });

  describe('isValidDiscordWebhookUrl', () => {
    it('should validate correct Discord webhook URLs', () => {
      expect(notificationService.isValidDiscordWebhookUrl(
        'https://discord.com/api/webhooks/123456789/abcdefghijklmnop'
      )).toBe(true);

      expect(notificationService.isValidDiscordWebhookUrl(
        'https://discordapp.com/api/webhooks/123456789/abcdefghijklmnop'
      )).toBe(true);
    });

    it('should reject invalid Discord webhook URLs', () => {
      expect(notificationService.isValidDiscordWebhookUrl(
        'https://example.com/webhook'
      )).toBe(false);

      expect(notificationService.isValidDiscordWebhookUrl(
        'http://discord.com/api/webhooks/123/abc'
      )).toBe(false);

      expect(notificationService.isValidDiscordWebhookUrl('')).toBe(false);
      expect(notificationService.isValidDiscordWebhookUrl(null)).toBe(false);
    });
  });

  describe('buildNotification', () => {
    it('should build serverStart notification with correct color', () => {
      const notification = notificationService.buildNotification('serverStart', {
        serverName: 'TestServer'
      });

      expect(notification.title).toBe('Server Started');
      expect(notification.description).toContain('TestServer');
      expect(notification.color).toBe(0x22c55e); // Green
    });

    it('should build serverStop notification with correct color', () => {
      const notification = notificationService.buildNotification('serverStop', {
        serverName: 'TestServer'
      });

      expect(notification.title).toBe('Server Stopped');
      expect(notification.description).toContain('TestServer');
      expect(notification.color).toBe(0xeab308); // Yellow
    });

    it('should build serverError notification with error message', () => {
      const notification = notificationService.buildNotification('serverError', {
        serverName: 'TestServer',
        error: 'Connection refused'
      });

      expect(notification.title).toBe('Server Error');
      expect(notification.description).toContain('TestServer');
      expect(notification.description).toContain('Connection refused');
      expect(notification.color).toBe(0xef4444); // Red
    });

    it('should build backupComplete notification with backup name', () => {
      const notification = notificationService.buildNotification('backupComplete', {
        serverName: 'TestServer',
        backupName: 'backup-2024-01-01.zip'
      });

      expect(notification.title).toBe('Backup Complete');
      expect(notification.description).toContain('TestServer');
      expect(notification.fields).toContainEqual(
        expect.objectContaining({ name: 'Backup', value: 'backup-2024-01-01.zip' })
      );
    });

    it('should build backupFailed notification with error', () => {
      const notification = notificationService.buildNotification('backupFailed', {
        serverName: 'TestServer',
        error: 'Disk full'
      });

      expect(notification.title).toBe('Backup Failed');
      expect(notification.description).toContain('TestServer');
      expect(notification.description).toContain('Disk full');
      expect(notification.color).toBe(0xef4444); // Red
    });

    it('should return null for unknown event types', () => {
      const notification = notificationService.buildNotification('unknownEvent', {});
      expect(notification).toBeNull();
    });
  });

  describe('sendDiscordMessage', () => {
    it('should send message with correct format', async () => {
      axios.post.mockResolvedValueOnce({ status: 204 });

      await notificationService.sendDiscordMessage(
        'https://discord.com/api/webhooks/123/abc',
        {
          title: 'Test',
          description: 'Test message',
          color: 0x3b82f6
        }
      );

      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/abc',
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: 'Test',
              description: 'Test message',
              color: 0x3b82f6,
              footer: { text: 'Minecraft Server Manager' }
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should throw error on API failure', async () => {
      axios.post.mockRejectedValueOnce({
        response: { status: 400 }
      });

      await expect(
        notificationService.sendDiscordMessage(
          'https://discord.com/api/webhooks/123/abc',
          { title: 'Test', description: 'Test' }
        )
      ).rejects.toThrow('Discord API error: 400');
    });
  });
});
