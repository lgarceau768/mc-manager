import { useEffect, useMemo, useState } from 'react';
import { serverApi } from '../services/api';
import './FileExplorer.css';

function FileExplorer({ serverId }) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [];
    parts.reduce((acc, part) => {
      const next = acc ? `${acc}/${part}` : part;
      crumbs.push({ label: part, path: next });
      return next;
    }, '');
    return crumbs;
  }, [currentPath]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await serverApi.listFiles(serverId, currentPath);
        setEntries(data.entries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [serverId, currentPath]);

  const handleNavigate = (path) => {
    setCurrentPath(path);
  };

  const handleGoUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleSelectFile = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      await serverApi.uploadFile(serverId, currentPath, selectedFile);
      setSelectedFile(null);
      event.target.reset();
      const data = await serverApi.listFiles(serverId, currentPath);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (path) => {
    const url = serverApi.getFileDownloadUrl(serverId, path);
    window.open(url, '_blank');
  };

  return (
    <div className="file-explorer-card">
      <div className="file-explorer-header">
        <h3>File Explorer</h3>
        <div className="file-explorer-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentPath(currentPath)}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGoUp}
            disabled={!currentPath}
          >
            ↑ Up
          </button>
        </div>
      </div>

      <div className="file-explorer-breadcrumbs">
        <button
          type="button"
          className={`breadcrumb ${!currentPath ? 'active' : ''}`}
          onClick={() => handleNavigate('')}
        >
          /
        </button>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path}>
            <span className="breadcrumb-separator">/</span>
            <button
              type="button"
              className={`breadcrumb ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
              onClick={() => handleNavigate(crumb.path)}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      <div className="file-explorer-list">
        {loading ? (
          <div className="file-explorer-empty">Loading files...</div>
        ) : error ? (
          <div className="file-explorer-error">Error: {error}</div>
        ) : entries.length === 0 ? (
          <div className="file-explorer-empty">Directory empty.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.path}>
                  <td>
                    {entry.type === 'directory' ? (
                      <button
                        className="link-btn"
                        onClick={() => handleNavigate(entry.path)}
                      >
                        {entry.name}
                      </button>
                    ) : (
                      entry.name
                    )}
                  </td>
                  <td>{entry.type}</td>
                  <td>{entry.size != null ? formatBytes(entry.size) : '-'}</td>
                  <td>{entry.modified ? new Date(entry.modified).toLocaleString() : '-'}</td>
                  <td>
                    {entry.type === 'file' && (
                      <button
                        className="link-btn"
                        onClick={() => handleDownload(entry.path)}
                      >
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form className="file-upload-form" onSubmit={handleUpload}>
        <input
          type="file"
          onChange={handleSelectFile}
          disabled={uploading}
        />
        <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default FileExplorer;
