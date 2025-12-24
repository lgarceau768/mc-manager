import { useState } from 'react';
import { serverApi } from '../services/api';
import './CreateServerForm.css';

function CreateServerForm({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    version: '1.20.4',
    memory: '4G',
    cpuLimit: 2.0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const newServer = await serverApi.createServer(formData);
      onCreate(newServer);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Server</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Server Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              pattern="[a-zA-Z0-9-]+"
              minLength={3}
              maxLength={32}
              placeholder="my-minecraft-server"
            />
            <small>Alphanumeric characters and hyphens only (3-32 chars)</small>
          </div>

          <div className="form-group">
            <label htmlFor="version">Minecraft Version *</label>
            <input
              type="text"
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              required
              placeholder="1.20.4"
            />
            <small>Paper server version (e.g., 1.20.4, latest)</small>
          </div>

          <div className="form-group">
            <label htmlFor="memory">Memory Allocation *</label>
            <select
              id="memory"
              name="memory"
              value={formData.memory}
              onChange={handleChange}
              required
            >
              <option value="1G">1 GB</option>
              <option value="2G">2 GB</option>
              <option value="4G">4 GB (Recommended)</option>
              <option value="6G">6 GB</option>
              <option value="8G">8 GB</option>
              <option value="12G">12 GB</option>
              <option value="16G">16 GB</option>
            </select>
            <small>RAM allocated to the server</small>
          </div>

          <div className="form-group">
            <label htmlFor="cpuLimit">CPU Limit (cores)</label>
            <input
              type="number"
              id="cpuLimit"
              name="cpuLimit"
              value={formData.cpuLimit}
              onChange={handleChange}
              min={0.5}
              max={8}
              step={0.5}
              placeholder="2.0"
            />
            <small>Number of CPU cores (0.5 - 8.0)</small>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateServerForm;
