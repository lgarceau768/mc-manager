import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import dockerService from './dockerService.js';
import Server from '../models/Server.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupService {
  constructor() {
    this.backupsBasePath = process.env.BACKUPS_PATH || path.join(__dirname, '../../data/backups');

    // Ensure backups directory exists
    if (!fs.existsSync(this.backupsBasePath)) {
      fs.mkdirSync(this.backupsBasePath, { recursive: true });
    }
  }

  /**
   * Get backup directory for a specific server
   */
  getServerBackupDir(serverId) {
    const backupDir = path.join(this.backupsBasePath, serverId);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  /**
   * Create a backup for a server
   */
  async createBackup(serverId, description = '') {
    try {
      logger.info(`Creating backup for server: ${serverId}`);

      // Get server from database
      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError('Server not found');
      }

      // Verify server volume exists
      if (!fs.existsSync(server.volume_path)) {
        throw new NotFoundError('Server volume path not found');
      }

      const wasRunning = server.status === 'running';

      // If server is running, pause world saving
      if (wasRunning) {
        logger.info('Server is running, pausing world saving...');
        try {
          await dockerService.executeCommand(server.container_id, 'save-off');
          await dockerService.executeCommand(server.container_id, 'save-all flush');
          // Give the server a moment to complete the save
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.warn(`Failed to pause saving via RCON: ${error.message}`);
          // Continue with backup anyway, but log the warning
        }
      }

      try {
        // Generate backup metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup-${timestamp}`;
        const backupDir = this.getServerBackupDir(serverId);
        const backupFileName = `${backupId}.zip`;
        const backupFilePath = path.join(backupDir, backupFileName);

        // Create the backup zip file
        await this.createZipBackup(server.volume_path, backupFilePath);

        // Create metadata file
        const metadata = {
          id: backupId,
          serverId,
          serverName: server.name,
          timestamp: new Date().toISOString(),
          description,
          size: fs.statSync(backupFilePath).size,
          fileName: backupFileName
        };

        const metadataPath = path.join(backupDir, `${backupId}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        logger.info(`Backup created successfully: ${backupFileName}`);

        return metadata;
      } finally {
        // Resume world saving if it was running
        if (wasRunning) {
          try {
            await dockerService.executeCommand(server.container_id, 'save-on');
            logger.info('World saving resumed');
          } catch (error) {
            logger.warn(`Failed to resume saving via RCON: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a zip archive of the server directory
   */
  createZipBackup(sourcePath, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 6 } // Compression level (0-9)
      });

      output.on('close', () => {
        logger.info(`Backup archive created: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add all files from the server directory
      archive.directory(sourcePath, false);

      archive.finalize();
    });
  }

  /**
   * List all backups for a server
   */
  listBackups(serverId) {
    try {
      const backupDir = this.getServerBackupDir(serverId);

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      // Read all .json metadata files
      const files = fs.readdirSync(backupDir);
      const metadataFiles = files.filter(f => f.endsWith('.json'));

      const backups = metadataFiles.map(file => {
        const metadataPath = path.join(backupDir, file);
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        // Check if backup file still exists
        const backupPath = path.join(backupDir, metadata.fileName);
        metadata.exists = fs.existsSync(backupPath);

        return metadata;
      });

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      logger.error(`Failed to list backups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific backup
   */
  getBackup(serverId, backupId) {
    try {
      const backupDir = this.getServerBackupDir(serverId);
      const metadataPath = path.join(backupDir, `${backupId}.json`);

      if (!fs.existsSync(metadataPath)) {
        throw new NotFoundError('Backup not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const backupPath = path.join(backupDir, metadata.fileName);

      if (!fs.existsSync(backupPath)) {
        throw new NotFoundError('Backup file not found');
      }

      return {
        metadata,
        filePath: backupPath
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to get backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a backup
   */
  deleteBackup(serverId, backupId) {
    try {
      logger.info(`Deleting backup: ${backupId}`);

      const backupDir = this.getServerBackupDir(serverId);
      const metadataPath = path.join(backupDir, `${backupId}.json`);

      if (!fs.existsSync(metadataPath)) {
        throw new NotFoundError('Backup not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const backupPath = path.join(backupDir, metadata.fileName);

      // Delete backup file and metadata
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      fs.unlinkSync(metadataPath);

      logger.info(`Backup deleted successfully: ${backupId}`);
    } catch (error) {
      logger.error(`Failed to delete backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a backup
   */
  async restoreBackup(serverId, backupId) {
    try {
      logger.info(`Restoring backup: ${backupId} for server: ${serverId}`);

      // Get server from database
      const server = Server.findById(serverId);
      if (!server) {
        throw new NotFoundError('Server not found');
      }

      // Server must be stopped to restore
      if (server.status === 'running' || server.status === 'starting') {
        throw new ValidationError('Server must be stopped before restoring a backup');
      }

      // Get backup
      const { metadata, filePath } = this.getBackup(serverId, backupId);

      logger.info(`Restoring backup from: ${filePath}`);

      // Backup current state before restoring (safety measure)
      const safetyBackupId = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const safetyBackupPath = path.join(this.getServerBackupDir(serverId), `${safetyBackupId}.zip`);

      if (fs.existsSync(server.volume_path) && fs.readdirSync(server.volume_path).length > 0) {
        logger.info('Creating safety backup of current state...');
        await this.createZipBackup(server.volume_path, safetyBackupPath);

        const safetyMetadata = {
          id: safetyBackupId,
          serverId,
          serverName: server.name,
          timestamp: new Date().toISOString(),
          description: 'Automatic backup before restore',
          size: fs.statSync(safetyBackupPath).size,
          fileName: `${safetyBackupId}.zip`
        };

        fs.writeFileSync(
          path.join(this.getServerBackupDir(serverId), `${safetyBackupId}.json`),
          JSON.stringify(safetyMetadata, null, 2)
        );
      }

      // Clear the server directory
      this.clearDirectory(server.volume_path);

      // Extract backup
      const zip = new AdmZip(filePath);
      zip.extractAllTo(server.volume_path, true);

      logger.info('Backup restored successfully');

      return {
        success: true,
        message: 'Backup restored successfully',
        safetyBackupId: fs.existsSync(safetyBackupPath) ? safetyBackupId : null
      };
    } catch (error) {
      logger.error(`Failed to restore backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear all files in a directory
   */
  clearDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.clearDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Get total backup size for a server
   */
  getBackupStats(serverId) {
    try {
      const backups = this.listBackups(serverId);
      const totalSize = backups.reduce((sum, backup) => sum + (backup.size || 0), 0);
      const totalCount = backups.length;

      return {
        count: totalCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        backups
      };
    } catch (error) {
      logger.error(`Failed to get backup stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export default new BackupService();
