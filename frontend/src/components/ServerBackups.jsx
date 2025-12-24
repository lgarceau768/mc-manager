import { useState, useEffect } from 'react';
import { serverApi } from '../services/api';
import './ServerBackups.css';

function ServerBackups({ serverId, serverStatus }) {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);

  // Schedule state
  const [schedule, setSchedule] = useState(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleRetention, setScheduleRetention] = useState(5);
  const [frequencies, setFrequencies] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    loadBackups();
    loadSchedule();
    loadFrequencies();
  }, [serverId]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const [backupsResponse, statsResponse] = await Promise.all([
        serverApi.listBackups(serverId),
        serverApi.getBackupStats(serverId)
      ]);
      setBackups(backupsResponse.backups || []);
      setStats(statsResponse.stats || null);
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to load backups: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const response = await serverApi.getBackupSchedule(serverId);
      if (response.schedule) {
        setSchedule(response.schedule);
        setScheduleEnabled(response.schedule.enabled);
        setScheduleFrequency(response.schedule.frequency);
        setScheduleRetention(response.schedule.retentionCount);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const loadFrequencies = async () => {
    try {
      const response = await serverApi.getBackupFrequencies();
      setFrequencies(response.frequencies || []);
    } catch (error) {
      console.error('Failed to load frequencies:', error);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSavingSchedule(true);
      setStatus(null);
      await serverApi.updateBackupSchedule(serverId, {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        retentionCount: scheduleRetention
      });
      setStatus({ type: 'success', message: 'Backup schedule updated successfully' });
      await loadSchedule();
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to update schedule: ${error.message}` });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!window.confirm('Are you sure you want to delete the backup schedule?')) {
      return;
    }

    try {
      setStatus(null);
      await serverApi.deleteBackupSchedule(serverId);
      setStatus({ type: 'success', message: 'Backup schedule deleted successfully' });
      setSchedule(null);
      setScheduleEnabled(false);
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to delete schedule: ${error.message}` });
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setStatus(null);
      await serverApi.createBackup(serverId, description);
      setStatus({ type: 'success', message: 'Backup created successfully' });
      setDescription('');
      await loadBackups();
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to create backup: ${error.message}` });
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm('Are you sure you want to restore this backup? The server must be stopped and the current data will be replaced.')) {
      return;
    }

    try {
      setRestoring(true);
      setStatus(null);
      const result = await serverApi.restoreBackup(serverId, backupId);
      setStatus({
        type: 'success',
        message: result.safetyBackupId
          ? `Backup restored successfully. A safety backup was created: ${result.safetyBackupId}`
          : 'Backup restored successfully'
      });
      await loadBackups();
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to restore backup: ${error.message}` });
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
      return;
    }

    try {
      setStatus(null);
      await serverApi.deleteBackup(serverId, backupId);
      setStatus({ type: 'success', message: 'Backup deleted successfully' });
      await loadBackups();
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to delete backup: ${error.message}` });
    }
  };

  const handleDownloadBackup = (backupId) => {
    const url = serverApi.getBackupDownloadUrl(serverId, backupId);
    window.open(url, '_blank');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const canRestore = serverStatus === 'stopped';

  const formatNextRun = (timestamp) => {
    if (!timestamp) return 'Not scheduled';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="server-backups">
      <div className="backups-header">
        <h3>Server Backups</h3>
        {stats && (
          <div className="backup-stats">
            <span className="stat-item">
              <strong>{stats.count}</strong> backups
            </span>
            <span className="stat-item">
              <strong>{stats.totalSizeFormatted}</strong> total
            </span>
          </div>
        )}
      </div>

      {/* Backup Schedule Section */}
      <div className="backup-schedule-section">
        <h4>Automated Backups</h4>
        <div className="schedule-form">
          <div className="schedule-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {scheduleEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {scheduleEnabled && (
            <div className="schedule-settings">
              <div className="schedule-field">
                <label>Frequency:</label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                >
                  {frequencies.map((freq) => (
                    <option key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="schedule-field">
                <label>Keep last:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={scheduleRetention}
                  onChange={(e) => setScheduleRetention(parseInt(e.target.value))}
                />
                <span className="field-hint">backups</span>
              </div>

              {schedule && schedule.nextRun && (
                <div className="schedule-info">
                  Next backup: {formatNextRun(schedule.nextRun)}
                </div>
              )}
            </div>
          )}

          <div className="schedule-actions">
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="btn btn-primary"
            >
              {savingSchedule ? 'Saving...' : 'Save Schedule'}
            </button>
            {schedule && (
              <button
                onClick={handleDeleteSchedule}
                className="btn btn-danger"
              >
                Delete Schedule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Backup Section */}
      <div className="create-backup-section">
        <h4>Create New Backup</h4>
        <div className="create-backup-form">
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
            className="backup-description-input"
          />
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="btn btn-primary"
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
        {!canRestore && (
          <p className="backup-warning">
            ⚠️ Server must be stopped to restore backups
          </p>
        )}
      </div>

      {/* Status Messages */}
      {status && (
        <div className={`backup-status status-${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Backups List */}
      {loading ? (
        <div className="backups-loading">Loading backups...</div>
      ) : backups.length === 0 ? (
        <div className="no-backups">
          <p>No backups yet. Create your first backup above.</p>
        </div>
      ) : (
        <div className="backups-list">
          <h4>Available Backups</h4>
          <table className="backups-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className={!backup.exists ? 'backup-missing' : ''}>
                  <td className="backup-date">{formatDate(backup.timestamp)}</td>
                  <td className="backup-description">
                    {backup.description || <em>No description</em>}
                    {!backup.exists && <span className="missing-badge">Missing</span>}
                  </td>
                  <td className="backup-size">{formatSize(backup.size)}</td>
                  <td className="backup-actions">
                    <button
                      onClick={() => handleDownloadBackup(backup.id)}
                      className="btn btn-small btn-secondary"
                      disabled={!backup.exists}
                      title="Download backup"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleRestoreBackup(backup.id)}
                      className="btn btn-small btn-warning"
                      disabled={!canRestore || restoring || !backup.exists}
                      title={!canRestore ? 'Stop server first' : 'Restore this backup'}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="btn btn-small btn-danger"
                      title="Delete backup"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ServerBackups;
