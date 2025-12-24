import { useState } from 'react';
import { serverApi } from '../services/api';
import './ModUploader.css';

function ModUploader({ serverId, serverType }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setStatus(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setStatus({ type: 'error', message: 'Select a file to upload' });
      return;
    }

    try {
      setUploading(true);
      setStatus(null);
      const result = await serverApi.uploadMod(serverId, selectedFile);
      setStatus({ type: 'success', message: result.message || 'Upload complete' });
      setSelectedFile(null);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mod-uploader">
      <h3>Upload Mods / Packs</h3>
      <p className="mod-uploader-description">
        Upload individual mod/plugin <code>.jar</code> files or import full CurseForge server packs <code>.zip</code>.
        Mods go into the {serverType === 'PAPER' ? 'plugins' : 'mods'} folder automatically.
      </p>
      <form onSubmit={handleSubmit} className="mod-uploader-form">
        <input
          type="file"
          accept=".jar,.zip"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {status && (
        <div className={`mod-uploader-status status-${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default ModUploader;
