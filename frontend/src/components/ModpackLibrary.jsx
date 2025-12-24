import { useEffect, useState } from 'react';
import { serverApi } from '../services/api';
import { SERVER_TYPE_OPTIONS } from '../utils/serverTypes';
import ModpackImporter from './ModpackImporter';
import './ModpackLibrary.css';

function ModpackLibrary({ initialType = 'PAPER', serverId = null, serverStatus = null }) {
  const [selectedType, setSelectedType] = useState(initialType);
  const [modpacks, setModpacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setSelectedType(initialType || 'PAPER');
  }, [initialType]);

  useEffect(() => {
    const fetchModpacks = async () => {
      try {
        setLoading(true);
        const data = await serverApi.listSavedModpacks(selectedType);
        setModpacks(data || []);
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchModpacks();
  }, [selectedType]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setStatus({ type: 'error', message: 'Select a modpack .zip file' });
      return;
    }

    try {
      setUploading(true);
      setStatus(null);
      await serverApi.uploadSavedModpack(selectedType, selectedFile);
      setSelectedFile(null);
      event.target.reset();
      const data = await serverApi.listSavedModpacks(selectedType);
      setModpacks(data || []);
      setStatus({ type: 'success', message: 'Modpack saved successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleImportComplete = async (result) => {
    // Refresh modpack list
    const data = await serverApi.listSavedModpacks(selectedType);
    setModpacks(data || []);
  };

  const handleApplyModpack = async (modpackFilename) => {
    if (!serverId) {
      setStatus({ type: 'error', message: 'No server selected' });
      return;
    }

    if (serverStatus === 'running') {
      setStatus({ type: 'error', message: 'Server must be stopped before applying a modpack' });
      return;
    }

    try {
      setApplying(modpackFilename);
      setStatus(null);
      await serverApi.applyModpackToServer(serverId, modpackFilename);
      setStatus({ type: 'success', message: `Modpack "${modpackFilename}" applied successfully` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="modpack-library-card">
      <div className="modpack-library-header">
        <h3>Saved Modpacks</h3>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {SERVER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Modpack Importer */}
      <div className="modpack-importer-section">
        <ModpackImporter
          serverType={selectedType}
          onImportComplete={handleImportComplete}
        />
      </div>

      <div className="modpack-library-divider">
        <span>OR</span>
      </div>

      <div className="modpack-library-list">
        {loading ? (
          <div className="modpack-library-empty">Loading modpacks...</div>
        ) : modpacks.length === 0 ? (
          <div className="modpack-library-empty">No modpacks saved yet.</div>
        ) : (
          <ul>
            {modpacks.map((pack) => (
              <li key={pack.filename}>
                <div className="modpack-info">
                  <span className="modpack-name">{pack.name}</span>
                  <code className="modpack-filename">{pack.filename}</code>
                </div>
                {serverId && (
                  <button
                    className="btn btn-sm btn-apply"
                    onClick={() => handleApplyModpack(pack.filename)}
                    disabled={applying === pack.filename || serverStatus === 'running'}
                    title={serverStatus === 'running' ? 'Stop the server first' : 'Apply this modpack to the server'}
                  >
                    {applying === pack.filename ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="modpack-upload-form" onSubmit={handleUpload}>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          disabled={uploading}
        />
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          {uploading ? 'Saving...' : 'Save Modpack'}
        </button>
      </form>

      {status && (
        <div className={`modpack-library-status status-${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default ModpackLibrary;
