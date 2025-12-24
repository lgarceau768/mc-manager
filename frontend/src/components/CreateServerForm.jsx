import { useState, useEffect, useCallback } from 'react';
import { serverApi } from '../services/api';
import { SERVER_TYPE_OPTIONS } from '../utils/serverTypes';
import './CreateServerForm.css';

function CreateServerForm({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'PAPER',
    version: '1.20.4',
    memory: '4G',
    cpuLimit: 2.0,
    modpack: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modpackOptions, setModpackOptions] = useState([]);
  const [modpackLoading, setModpackLoading] = useState(false);

  const fetchModpacks = useCallback(async (type) => {
    try {
      setModpackLoading(true);
      const packs = await serverApi.listSavedModpacks(type);
      setModpackOptions(packs || []);
    } catch (err) {
      console.error('Failed to load modpacks', err);
      setModpackOptions([]);
    } finally {
      setModpackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModpacks(formData.type);
  }, [formData.type, fetchModpacks]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        type: value,
        modpack: ''
      }));
      return;
    }
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
      const payload = {
        ...formData,
        modpack: formData.modpack || undefined
      };
      const newServer = await serverApi.createServer(payload);
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
              pattern="(?:[a-zA-Z0-9]|-)+"
              minLength={3}
              maxLength={32}
              placeholder="my-minecraft-server"
            />
            <small>Alphanumeric characters and hyphens only (3-32 chars)</small>
          </div>

          <div className="form-group">
            <label htmlFor="type">Server Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {SERVER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>Choose the mod loader/platform to install</small>
          </div>

          <div className="form-group">
            <label htmlFor="modpack">Saved Modpack</label>
            <div className="modpack-select-row">
              <select
                id="modpack"
                name="modpack"
                value={formData.modpack}
                onChange={handleChange}
                disabled={modpackLoading || modpackOptions.length === 0}
              >
                <option value="">None</option>
                {modpackOptions.map((pack) => (
                  <option key={pack.filename} value={pack.filename}>
                    {pack.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fetchModpacks(formData.type)}
                disabled={modpackLoading}
              >
                ↻
              </button>
            </div>
            <small>Select a saved modpack for this server type (optional)</small>
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
            <small>Game version for the selected loader (e.g., 1.20.4, latest)</small>
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
