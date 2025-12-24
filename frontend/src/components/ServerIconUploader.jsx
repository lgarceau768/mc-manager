import { useState } from 'react';
import { serverApi } from '../services/api';
import './ServerIconUploader.css';

function ServerIconUploader({ serverId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [version, setVersion] = useState(Date.now());
  const [showFallback, setShowFallback] = useState(false);

  const iconUrl = `/api/servers/${serverId}/icon?ts=${version}`;

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setStatus(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setStatus({ type: 'error', message: 'Please select a PNG image' });
      return;
    }

    try {
      setUploading(true);
      setStatus(null);
      await serverApi.uploadServerIcon(serverId, selectedFile);
      setStatus({ type: 'success', message: 'Server icon updated' });
      setSelectedFile(null);
      setShowFallback(false);
      setVersion(Date.now());
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="server-icon-card">
      <h3>Server Icon</h3>
      <div className="server-icon-preview">
        {showFallback ? (
          <div className="icon-placeholder">64×64 PNG</div>
        ) : (
          <img
            key={version}
            src={iconUrl}
            alt="Server icon"
            onError={() => setShowFallback(true)}
          />
        )}
      </div>
      <form className="server-icon-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".png"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Icon'}
        </button>
      </form>
      <p className="icon-hint">PNG format, 64×64 pixels.</p>
      {status && (
        <div className={`icon-status status-${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default ServerIconUploader;
