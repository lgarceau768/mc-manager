import db from './db.js';

class Server {
  /**
   * Create a new server record
   */
  static create({ id, name, type, version, port, memory, cpuLimit, volumePath }) {
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO servers (id, name, type, version, port, status, memory, cpu_limit, volume_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'stopped', ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(id, name, type, version, port, memory, cpuLimit || null, volumePath, now, now);

    if (result.changes === 0) {
      throw new Error('Failed to create server');
    }

    return this.findById(id);
  }

  /**
   * Find all servers
   */
  static findAll() {
    const stmt = db.prepare('SELECT * FROM servers ORDER BY created_at DESC');
    return stmt.all();
  }

  /**
   * Find server by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find server by name
   */
  static findByName(name) {
    const stmt = db.prepare('SELECT * FROM servers WHERE name = ?');
    return stmt.get(name);
  }

  /**
   * Find server by port
   */
  static findByPort(port) {
    const stmt = db.prepare('SELECT * FROM servers WHERE port = ?');
    return stmt.get(port);
  }

  /**
   * Find servers by status
   */
  static findByStatus(status) {
    const stmt = db.prepare('SELECT * FROM servers WHERE status = ? ORDER BY created_at DESC');
    return stmt.all(status);
  }

  /**
   * Update server
   */
  static update(id, updates) {
    const allowedFields = ['name', 'status', 'container_id', 'memory', 'cpu_limit'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = ?');
    values.push(Date.now());

    // Add id for WHERE clause
    values.push(id);

    const sql = `UPDATE servers SET ${updateFields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete server
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM servers WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all used ports
   */
  static getUsedPorts() {
    const stmt = db.prepare('SELECT port FROM servers');
    const rows = stmt.all();
    return rows.map(row => row.port);
  }
}

export default Server;
