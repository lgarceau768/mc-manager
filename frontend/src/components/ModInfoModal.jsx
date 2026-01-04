import './ModInfoModal.css';

function ModInfoModal({ mod, onClose }) {
  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mod-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mod.name || mod.filename}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          <div className="info-section">
            <h4>File Information</h4>
            <div className="info-row">
              <span className="label">Filename:</span>
              <span className="value">{mod.filename}</span>
            </div>
            <div className="info-row">
              <span className="label">Size:</span>
              <span className="value">{formatSize(mod.size)}</span>
            </div>
            <div className="info-row">
              <span className="label">Modified:</span>
              <span className="value">{formatDate(mod.modifiedAt)}</span>
            </div>
            <div className="info-row">
              <span className="label">Status:</span>
              <span className={`value status ${mod.enabled ? 'enabled' : 'disabled'}`}>
                {mod.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {(mod.modId || mod.name || mod.version) && (
            <div className="info-section">
              <h4>Mod Metadata</h4>
              {mod.modId && (
                <div className="info-row">
                  <span className="label">Mod ID:</span>
                  <span className="value mono">{mod.modId}</span>
                </div>
              )}
              {mod.version && (
                <div className="info-row">
                  <span className="label">Version:</span>
                  <span className="value mono">{mod.version}</span>
                </div>
              )}
              {mod.authors && (
                <div className="info-row">
                  <span className="label">Author(s):</span>
                  <span className="value">{mod.authors}</span>
                </div>
              )}
              {mod.source && (
                <div className="info-row">
                  <span className="label">Source:</span>
                  <span className="value">{mod.source}</span>
                </div>
              )}
            </div>
          )}

          {mod.description && (
            <div className="info-section">
              <h4>Description</h4>
              <p className="description">{mod.description}</p>
            </div>
          )}

          {mod.mainClass && (
            <div className="info-section">
              <h4>Plugin Information</h4>
              <div className="info-row">
                <span className="label">Main Class:</span>
                <span className="value mono">{mod.mainClass}</span>
              </div>
              {mod.apiVersion && (
                <div className="info-row">
                  <span className="label">API Version:</span>
                  <span className="value mono">{mod.apiVersion}</span>
                </div>
              )}
            </div>
          )}

          {mod.extractionError && (
            <div className="info-section">
              <p className="extraction-warning">
                Could not extract all metadata: {mod.extractionError}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModInfoModal;
