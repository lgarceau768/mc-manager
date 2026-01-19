import { useState, useEffect } from 'react';
import ModUploader from './ModUploader';
import ModInfoModal from './ModInfoModal';
import ModIcon from './ModIcon';
import ModSearch from './ModSearch';
import { modApi } from '../services/api';
import './InstalledModsList.css';

function InstalledModsList({ serverId, serverType, serverStatus, serverVersion }) {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMod, setSelectedMod] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const loadMods = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modApi.listServerMods(serverId);
      setMods(data.mods || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMods();
  }, [serverId]);

  const handleToggle = async (filename) => {
    if (serverStatus === 'running') {
      alert('Stop the server before toggling mods');
      return;
    }

    try {
      setActionInProgress(filename);
      await modApi.toggleMod(serverId, filename);
      await loadMods();
    } catch (err) {
      alert(`Failed to toggle mod: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (filename) => {
    if (serverStatus === 'running') {
      alert('Stop the server before deleting mods');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      setActionInProgress(filename);
      await modApi.deleteMod(serverId, filename);
      await loadMods();
    } catch (err) {
      alert(`Failed to delete mod: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleViewInfo = async (mod) => {
    try {
      const info = await modApi.getModInfo(serverId, mod.filename);
      setSelectedMod(info);
    } catch (err) {
      alert(`Failed to get mod info: ${err.message}`);
    }
  };

  const handleDownload = (filename) => {
    const downloadUrl = modApi.getModDownloadUrl(serverId, filename);
    window.open(downloadUrl, '_blank');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isRunning = serverStatus === 'running';

  return (
    <div className="installed-mods">
      <div className="mods-header">
        <h4>
          Installed {serverType === 'PAPER' ? 'Plugins' : 'Mods'}
          <span className="mod-count">{mods.length}</span>
        </h4>
        <div className="mods-actions">
          <ModUploader
            serverId={serverId}
            serverType={serverType}
            onUploaded={loadMods}
            compact
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadMods}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="running-warning">
          Stop the server to enable/disable or delete mods
        </div>
      )}

      {error && (
        <div className="mods-error">
          <p>Failed to load mods: {error}</p>
        </div>
      )}

      {loading && <div className="mods-loading">Loading mods...</div>}

      {!loading && !error && mods.length === 0 && (
        <div className="no-mods">
          <p>No {serverType === 'PAPER' ? 'plugins' : 'mods'} installed</p>
          <p className="hint">
            Upload a .jar file or use the search section below to find {serverType === 'PAPER' ? 'plugins' : 'mods'}
          </p>
        </div>
      )}

      {!loading && serverType !== 'PAPER' && (
        <div className="search-toggle-section">
          <button
            className={`search-toggle-btn ${showSearch ? 'expanded' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
            title={showSearch ? 'Hide search' : 'Show search'}
          >
            <span className="toggle-icon">{showSearch ? '▼' : '▶'}</span>
            <span className="toggle-text">Search for {serverType === 'PAPER' ? 'Plugins' : 'Mods'}</span>
          </button>

          {showSearch && (
            <div className="embedded-search">
              <ModSearch
                serverId={serverId}
                serverType={serverType}
                serverVersion={serverVersion}
                serverStatus={serverStatus}
                onInstallSuccess={loadMods}
              />
            </div>
          )}
        </div>
      )}

      {!loading && mods.length > 0 && (
        <table className="mods-table">
          <thead>
            <tr>
              <th className="th-icon"></th>
              <th>Name</th>
              <th>Version</th>
              <th>Size</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mods.map((mod) => (
              <tr
                key={mod.filename}
                className={mod.enabled ? '' : 'disabled-mod'}
              >
                <td className="mod-icon-cell">
                  <ModIcon
                    serverId={serverId}
                    filename={mod.filename}
                    modName={mod.name || mod.filename}
                  />
                </td>
                <td className="mod-name">
                  <span title={mod.filename}>
                    {mod.name || mod.filename.replace('.jar', '').replace('.disabled', '')}
                  </span>
                  {mod.authors && (
                    <span className="mod-authors">by {mod.authors}</span>
                  )}
                </td>
                <td className="mod-version">{mod.version || '-'}</td>
                <td className="mod-size">{formatSize(mod.size)}</td>
                <td className="mod-status">
                  <span className={`status-badge ${mod.enabled ? 'enabled' : 'disabled'}`}>
                    {mod.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="mod-actions">
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={() => handleViewInfo(mod)}
                    title="View Info"
                  >
                    Info
                  </button>
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={() => handleDownload(mod.filename)}
                    title="Download JAR"
                  >
                    Download
                  </button>
                  <button
                    className={`btn btn-xs ${mod.enabled ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => handleToggle(mod.filename)}
                    disabled={isRunning || actionInProgress === mod.filename}
                    title={mod.enabled ? 'Disable' : 'Enable'}
                  >
                    {actionInProgress === mod.filename
                      ? '...'
                      : mod.enabled
                      ? 'Disable'
                      : 'Enable'}
                  </button>
                  <button
                    className="btn btn-xs btn-danger"
                    onClick={() => handleDelete(mod.filename)}
                    disabled={isRunning || actionInProgress === mod.filename}
                    title="Delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedMod && (
        <ModInfoModal
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
        />
      )}
    </div>
  );
}

export default InstalledModsList;
