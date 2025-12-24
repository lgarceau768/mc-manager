import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database/servers.db');

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

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
    CREATE INDEX IF NOT EXISTS idx_servers_port ON servers(port);
  `;

  db.exec(createServersTable);
  db.exec(createIndexes);
};

// Initialize schema on import
initSchema();

export default db;
