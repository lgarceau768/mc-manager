import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NotificationService {
  constructor() {
    this.dataPath = process.env.DATA_PATH || path.join(__dirname, '../../../data');
    this.notificationsDir = path.join(this.dataPath, 'notifications');

    // Ensure notifications directory exists
    if (!fs.existsSync(this.notificationsDir)) {
      fs.mkdirSync(this.notificationsDir, { recursive: true });
    }
  }

  /**
   * Get the settings file path for a server
   */
  getSettingsPath(serverId) {
    return path.join(this.notificationsDir, `${serverId}.json`);
  }

  /**
   * Get notification settings for a server
   */
  getSettings(serverId) {
    const settingsPath = this.getSettingsPath(serverId);

    if (!fs.existsSync(settingsPath)) {
      return this.getDefaultSettings();
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      return { ...this.getDefaultSettings(), ...JSON.parse(content) };
    } catch (error) {
      logger.warn(`Failed to read notification settings for ${serverId}: ${error.message}`);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default notification settings
   */
  getDefaultSettings() {
    return {
      discordWebhookUrl: '',
      enabled: false,
      events: {
        serverStart: true,
        serverStop: true,
        serverError: true,
        playerJoin: false,
        playerLeave: false,
        backupComplete: true,
        backupFailed: true
      }
    };
  }

  /**
   * Save notification settings for a server
   */
  saveSettings(serverId, settings) {
    const settingsPath = this.getSettingsPath(serverId);
    const currentSettings = this.getSettings(serverId);

    // Validate webhook URL if provided
    if (settings.discordWebhookUrl && settings.discordWebhookUrl.trim()) {
      if (!this.isValidDiscordWebhookUrl(settings.discordWebhookUrl)) {
        throw new ValidationError('Invalid Discord webhook URL');
      }
    }

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      events: {
        ...currentSettings.events,
        ...(settings.events || {})
      }
    };

    try {
      fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
      logger.info(`Notification settings saved for server ${serverId}`);
      return updatedSettings;
    } catch (error) {
      logger.error(`Failed to save notification settings: ${error.message}`);
      throw new ValidationError('Failed to save notification settings');
    }
  }

  /**
   * Delete notification settings for a server
   */
  deleteSettings(serverId) {
    const settingsPath = this.getSettingsPath(serverId);

    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
      logger.info(`Notification settings deleted for server ${serverId}`);
    }
  }

  /**
   * Validate Discord webhook URL format
   */
  isValidDiscordWebhookUrl(url) {
    const discordWebhookPattern = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
    return discordWebhookPattern.test(url);
  }

  /**
   * Test a Discord webhook by sending a test message
   */
  async testWebhook(serverId, webhookUrl) {
    if (!webhookUrl || !this.isValidDiscordWebhookUrl(webhookUrl)) {
      throw new ValidationError('Invalid Discord webhook URL');
    }

    try {
      await this.sendDiscordMessage(webhookUrl, {
        title: 'Test Notification',
        description: 'This is a test notification from Minecraft Server Manager.',
        color: 0x3b82f6, // Blue
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Test notification sent successfully!' };
    } catch (error) {
      logger.error(`Webhook test failed: ${error.message}`);
      throw new ValidationError(`Failed to send test notification: ${error.message}`);
    }
  }

  /**
   * Send a Discord webhook message
   */
  async sendDiscordMessage(webhookUrl, embed) {
    try {
      await axios.post(webhookUrl, {
        embeds: [{
          title: embed.title,
          description: embed.description,
          color: embed.color || 0x3b82f6,
          timestamp: embed.timestamp || new Date().toISOString(),
          footer: {
            text: 'Minecraft Server Manager'
          },
          fields: embed.fields || []
        }]
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    } catch (error) {
      if (error.response) {
        throw new Error(`Discord API error: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Send a notification for a server event
   */
  async notify(serverId, eventType, data = {}) {
    const settings = this.getSettings(serverId);

    // Check if notifications are enabled
    if (!settings.enabled || !settings.discordWebhookUrl) {
      return;
    }

    // Check if this event type is enabled
    if (!settings.events[eventType]) {
      return;
    }

    // Build the notification based on event type
    const notification = this.buildNotification(eventType, data);

    if (!notification) {
      return;
    }

    try {
      await this.sendDiscordMessage(settings.discordWebhookUrl, notification);
      logger.debug(`Sent ${eventType} notification for server ${serverId}`);
    } catch (error) {
      logger.error(`Failed to send ${eventType} notification for server ${serverId}: ${error.message}`);
    }
  }

  /**
   * Build notification content based on event type
   */
  buildNotification(eventType, data) {
    const serverName = data.serverName || 'Unknown Server';

    const notifications = {
      serverStart: {
        title: 'Server Started',
        description: `**${serverName}** is now online and ready to play!`,
        color: 0x22c55e // Green
      },
      serverStop: {
        title: 'Server Stopped',
        description: `**${serverName}** has been stopped.`,
        color: 0xeab308 // Yellow
      },
      serverError: {
        title: 'Server Error',
        description: `**${serverName}** encountered an error.\n\n${data.error || 'Unknown error'}`,
        color: 0xef4444 // Red
      },
      playerJoin: {
        title: 'Player Joined',
        description: `**${data.playerName || 'Unknown'}** joined **${serverName}**`,
        color: 0x3b82f6 // Blue
      },
      playerLeave: {
        title: 'Player Left',
        description: `**${data.playerName || 'Unknown'}** left **${serverName}**`,
        color: 0x6b7280 // Gray
      },
      backupComplete: {
        title: 'Backup Complete',
        description: `Backup created for **${serverName}**`,
        color: 0x22c55e, // Green
        fields: data.backupName ? [{ name: 'Backup', value: data.backupName, inline: true }] : []
      },
      backupFailed: {
        title: 'Backup Failed',
        description: `Backup failed for **${serverName}**\n\n${data.error || 'Unknown error'}`,
        color: 0xef4444 // Red
      }
    };

    return notifications[eventType] || null;
  }
}

// Export singleton instance
export default new NotificationService();
