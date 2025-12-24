import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

class BackupSchedule {
  /**
   * Create a new backup schedule
   */
  static create({ serverId, frequency, retentionCount = 5, enabled = true }) {
    const id = uuidv4();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO backup_schedules (
        id, server_id, enabled, frequency, retention_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, serverId, enabled ? 1 : 0, frequency, retentionCount, now, now);

    return this.findById(id);
  }

  /**
   * Find schedule by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM backup_schedules WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Find schedule by server ID
   */
  static findByServerId(serverId) {
    const stmt = db.prepare('SELECT * FROM backup_schedules WHERE server_id = ?');
    const row = stmt.get(serverId);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Get all schedules
   */
  static findAll() {
    const stmt = db.prepare('SELECT * FROM backup_schedules ORDER BY created_at DESC');
    const rows = stmt.all();
    return rows.map(row => this.mapRow(row));
  }

  /**
   * Get all enabled schedules
   */
  static findAllEnabled() {
    const stmt = db.prepare('SELECT * FROM backup_schedules WHERE enabled = 1');
    const rows = stmt.all();
    return rows.map(row => this.mapRow(row));
  }

  /**
   * Update a schedule
   */
  static update(id, updates) {
    const allowed = ['enabled', 'frequency', 'retention_count', 'last_run', 'next_run'];
    const fields = Object.keys(updates)
      .filter(key => allowed.includes(key))
      .map(key => {
        // Convert booleans to integers for SQLite
        if (key === 'enabled' && typeof updates[key] === 'boolean') {
          updates[key] = updates[key] ? 1 : 0;
        }
        return `${key} = ?`;
      });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = ?');

    const values = Object.keys(updates)
      .filter(key => allowed.includes(key))
      .map(key => updates[key]);
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE backup_schedules
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete a schedule
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM backup_schedules WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all schedules for a server
   */
  static deleteByServerId(serverId) {
    const stmt = db.prepare('DELETE FROM backup_schedules WHERE server_id = ?');
    const result = stmt.run(serverId);
    return result.changes > 0;
  }

  /**
   * Map database row to object
   */
  static mapRow(row) {
    return {
      id: row.id,
      serverId: row.server_id,
      enabled: Boolean(row.enabled),
      frequency: row.frequency,
      retentionCount: row.retention_count,
      lastRun: row.last_run,
      nextRun: row.next_run,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default BackupSchedule;
