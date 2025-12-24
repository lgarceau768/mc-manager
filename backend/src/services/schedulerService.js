import cron from 'node-cron';
import BackupSchedule from '../models/BackupSchedule.js';
import backupService from './backupService.js';
import logger from '../utils/logger.js';

class SchedulerService {
  constructor() {
    this.tasks = new Map(); // Map of serverId -> cron task
    this.frequencies = {
      hourly: '0 * * * *',        // Every hour at minute 0
      daily: '0 2 * * *',          // Every day at 2 AM
      weekly: '0 2 * * 0',         // Every Sunday at 2 AM
      monthly: '0 2 1 * *'         // First day of month at 2 AM
    };
  }

  /**
   * Initialize scheduler and load all enabled schedules
   */
  async initialize() {
    try {
      logger.info('Initializing backup scheduler...');
      const schedules = BackupSchedule.findAllEnabled();

      for (const schedule of schedules) {
        await this.scheduleBackup(schedule);
      }

      logger.info(`Backup scheduler initialized with ${schedules.length} active schedules`);
    } catch (error) {
      logger.error(`Failed to initialize scheduler: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule a backup for a server
   */
  async scheduleBackup(schedule) {
    try {
      // Stop existing task if any
      this.unscheduleBackup(schedule.serverId);

      if (!schedule.enabled) {
        logger.info(`Schedule for server ${schedule.serverId} is disabled, skipping`);
        return;
      }

      const cronExpression = this.frequencies[schedule.frequency];
      if (!cronExpression) {
        logger.error(`Invalid frequency: ${schedule.frequency}`);
        return;
      }

      logger.info(`Scheduling ${schedule.frequency} backups for server ${schedule.serverId}`);

      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledBackup(schedule);
      });

      this.tasks.set(schedule.serverId, task);

      // Calculate next run time
      const nextRun = this.calculateNextRun(schedule.frequency);
      BackupSchedule.update(schedule.id, { next_run: nextRun });

      logger.info(`Backup scheduled for server ${schedule.serverId} - Next run: ${new Date(nextRun).toISOString()}`);
    } catch (error) {
      logger.error(`Failed to schedule backup for server ${schedule.serverId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a scheduled backup
   */
  async executeScheduledBackup(schedule) {
    try {
      logger.info(`Executing scheduled backup for server ${schedule.serverId}`);

      // Create the backup
      const description = `Scheduled ${schedule.frequency} backup`;
      await backupService.createBackup(schedule.serverId, description);

      // Update last run time
      const now = Date.now();
      const nextRun = this.calculateNextRun(schedule.frequency);
      BackupSchedule.update(schedule.id, {
        last_run: now,
        next_run: nextRun
      });

      // Clean up old backups based on retention count
      await this.cleanupOldBackups(schedule.serverId, schedule.retentionCount);

      logger.info(`Scheduled backup completed for server ${schedule.serverId}`);
    } catch (error) {
      logger.error(`Scheduled backup failed for server ${schedule.serverId}: ${error.message}`);
    }
  }

  /**
   * Clean up old backups based on retention count
   */
  async cleanupOldBackups(serverId, retentionCount) {
    try {
      const backups = backupService.listBackups(serverId);

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Delete backups beyond retention count
      if (backups.length > retentionCount) {
        const backupsToDelete = backups.slice(retentionCount);

        for (const backup of backupsToDelete) {
          logger.info(`Deleting old backup: ${backup.id}`);
          await backupService.deleteBackup(serverId, backup.id);
        }

        logger.info(`Cleaned up ${backupsToDelete.length} old backups for server ${serverId}`);
      }
    } catch (error) {
      logger.error(`Failed to clean up old backups for server ${serverId}: ${error.message}`);
    }
  }

  /**
   * Unschedule a backup
   */
  unscheduleBackup(serverId) {
    const task = this.tasks.get(serverId);
    if (task) {
      task.stop();
      this.tasks.delete(serverId);
      logger.info(`Unscheduled backups for server ${serverId}`);
    }
  }

  /**
   * Create or update a schedule
   */
  async createOrUpdateSchedule(serverId, scheduleData) {
    try {
      let schedule = BackupSchedule.findByServerId(serverId);

      if (schedule) {
        // Update existing schedule
        schedule = BackupSchedule.update(schedule.id, scheduleData);
      } else {
        // Create new schedule
        schedule = BackupSchedule.create({
          serverId,
          ...scheduleData
        });
      }

      // Reschedule
      await this.scheduleBackup(schedule);

      return schedule;
    } catch (error) {
      logger.error(`Failed to create/update schedule for server ${serverId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get schedule for a server
   */
  getSchedule(serverId) {
    return BackupSchedule.findByServerId(serverId);
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(serverId) {
    try {
      this.unscheduleBackup(serverId);
      const deleted = BackupSchedule.deleteByServerId(serverId);

      if (deleted) {
        logger.info(`Deleted backup schedule for server ${serverId}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Failed to delete schedule for server ${serverId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  calculateNextRun(frequency) {
    const now = new Date();

    switch (frequency) {
      case 'hourly':
        now.setHours(now.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(2, 0, 0, 0);
        break;
      case 'weekly':
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        now.setDate(now.getDate() + daysUntilSunday);
        now.setHours(2, 0, 0, 0);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1, 1);
        now.setHours(2, 0, 0, 0);
        break;
      default:
        return null;
    }

    return now.getTime();
  }

  /**
   * Get available frequencies
   */
  getAvailableFrequencies() {
    return Object.keys(this.frequencies);
  }

  /**
   * Shutdown scheduler
   */
  shutdown() {
    logger.info('Shutting down backup scheduler...');
    for (const [serverId, task] of this.tasks.entries()) {
      task.stop();
      logger.info(`Stopped scheduled backups for server ${serverId}`);
    }
    this.tasks.clear();
  }
}

// Export singleton instance
export default new SchedulerService();
