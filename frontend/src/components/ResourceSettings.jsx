import { useState, useEffect } from 'react';
import { serverApi } from '../services/api';
import './ResourceSettings.css';

function ResourceSettings({ server, onUpdated }) {
  const [form, setForm] = useState({
    memory: '4G',
    cpuLimit: 2.0
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!server) return;
    setForm({
      memory: server.memory || '4G',
      cpuLimit: server.cpu_limit || 2.0
    });
  }, [server]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'cpuLimit' ? parseFloat(value) : value
    }));
    setIsDirty(true);
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const updated = await serverApi.updateServerResources(server.id, form);
      setIsDirty(false);

      if (updated.restartRequired) {
        setStatus({
          type: 'warning',
          message: 'Resources updated. Restart the server for changes to take effect.'
        });
      } else {
        setStatus({
          type: 'success',
          message: 'Resource settings updated successfully.'
        });
      }

      onUpdated?.(updated);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const isRunning = server?.status === 'running';

  return (
    <div className="resource-settings-card">
      <h3>Resource Allocation</h3>
      <form className="resource-settings-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="memory">Memory (RAM)</label>
          <select
            id="memory"
            name="memory"
            value={form.memory}
            onChange={handleChange}
          >
            <option value="1G">1 GB</option>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="6G">6 GB</option>
            <option value="8G">8 GB</option>
            <option value="10G">10 GB</option>
            <option value="12G">12 GB</option>
            <option value="16G">16 GB</option>
          </select>
          <small>JVM heap size allocated to the Minecraft server</small>
        </div>

        <div className="form-row">
          <label htmlFor="cpuLimit">CPU Cores</label>
          <select
            id="cpuLimit"
            name="cpuLimit"
            value={form.cpuLimit}
            onChange={handleChange}
          >
            <option value={0.5}>0.5 cores</option>
            <option value={1}>1 core</option>
            <option value={1.5}>1.5 cores</option>
            <option value={2}>2 cores</option>
            <option value={3}>3 cores</option>
            <option value={4}>4 cores</option>
            <option value={6}>6 cores</option>
            <option value={8}>8 cores</option>
          </select>
          <small>CPU cores available to the container</small>
        </div>

        {isRunning && (
          <div className="resource-warning">
            Server is running. Changes will take effect after restart.
          </div>
        )}

        {status && (
          <div className={`resource-status status-${status.type}`}>
            {status.message}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !isDirty}
          >
            {saving ? 'Saving...' : 'Save Resources'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ResourceSettings;
