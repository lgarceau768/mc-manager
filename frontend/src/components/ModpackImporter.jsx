import { useState } from 'react';
import { serverApi } from '../services/api';
import './ModpackImporter.css';

function ModpackImporter({ serverType, onImportComplete }) {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setStatus({ type: 'error', message: 'Please enter a URL' });
      return;
    }

    try {
      setImporting(true);
      setStatus(null);

      const result = await serverApi.importModpackFromUrl(url, serverType);

      setStatus({
        type: 'success',
        message: `Modpack imported successfully! ${result.metadata?.name || 'Unknown modpack'} has been added to your library.`
      });

      setUrl('');

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Failed to import modpack: ${error.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  const detectSource = (url) => {
    if (url.includes('curseforge.com')) return 'CurseForge';
    if (url.includes('modrinth.com')) return 'Modrinth';
    return 'Direct Download';
  };

  return (
    <div className="modpack-importer">
      <h4>Import from URL</h4>
      <p className="importer-description">
        Import modpacks from CurseForge, Modrinth, or direct download links
      </p>

      <form onSubmit={handleImport} className="importer-form">
        <div className="url-input-wrapper">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://modrinth.com/modpack/... or https://curseforge.com/..."
            disabled={importing}
            className="url-input"
          />
          {url && (
            <span className="url-source">
              {detectSource(url)}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={importing || !url.trim()}
        >
          {importing ? 'Importing...' : 'Import Modpack'}
        </button>
      </form>

      {status && (
        <div className={`importer-status status-${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="importer-examples">
        <details>
          <summary>Example URLs</summary>
          <ul>
            <li>
              <strong>Modrinth:</strong> https://modrinth.com/modpack/fabric-modpack-name
            </li>
            <li>
              <strong>CurseForge:</strong> https://www.curseforge.com/minecraft/modpacks/modpack-name
            </li>
            <li>
              <strong>Direct:</strong> https://example.com/modpack.zip
            </li>
          </ul>
        </details>
      </div>

      {importing && (
        <div className="import-progress">
          <div className="progress-spinner"></div>
          <p>Downloading and validating modpack...</p>
          <p className="progress-note">This may take a few minutes for large modpacks</p>
        </div>
      )}
    </div>
  );
}

export default ModpackImporter;
