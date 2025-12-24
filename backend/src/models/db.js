import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../');
const defaultDatabasePath = path.join(projectRoot, 'data/database/servers.db');
const legacyDatabasePath = path.join(__dirname, '../../data/database/servers.db');

let resolvedDatabasePath = process.env.DATABASE_PATH || defaultDatabasePath;

if (!process.env.DATABASE_PATH && fs.existsSync(legacyDatabasePath)) {
  const legacyStats = fs.statSync(legacyDatabasePath);
  const defaultExists = fs.existsSync(defaultDatabasePath);
  const defaultStats = defaultExists ? fs.statSync(defaultDatabasePath) : null;

  if (!defaultExists || legacyStats.mtimeMs > (defaultStats?.mtimeMs || 0)) {
    fs.mkdirSync(path.dirname(defaultDatabasePath), { recursive: true });
    if (defaultExists) {
      const backupPath = `${defaultDatabasePath}.bak`;
      fs.copyFileSync(defaultDatabasePath, backupPath);
      logger.warn(`Existing database backed up to ${backupPath} before migrating legacy data`);
    }
    fs.copyFileSync(legacyDatabasePath, defaultDatabasePath);
    logger.info('Migrated legacy SQLite database from backend/data to data/database');
  }
}

// Get database path from environment or use default
const DATABASE_PATH = resolvedDatabasePath;

// Ensure database directory exists
const dbDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DATABASE_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
const initSchema = () => {
  const createServersTable = `
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      version TEXT NOT NULL,
      port INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'stopped',
      memory TEXT NOT NULL,
      cpu_limit TEXT,
      container_id TEXT,
      volume_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  const createBackupSchedulesTable = `
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL,
      retention_count INTEGER NOT NULL DEFAULT 5,
      last_run INTEGER,
      next_run INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    )
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
    CREATE INDEX IF NOT EXISTS idx_servers_port ON servers(port);
    CREATE INDEX IF NOT EXISTS idx_backup_schedules_server ON backup_schedules(server_id);
    CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled);
  `;

  db.exec(createServersTable);
  db.exec(createBackupSchedulesTable);
  db.exec(createIndexes);
};

// Initialize schema on import
initSchema();

export default db;
