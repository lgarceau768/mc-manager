import { useState } from 'react';
import { modApi } from '../services/api';
import './ModSearchResult.css';

function ModSearchResult({ mod, source, serverVersion, modLoader, onInstall, serverStatus }) {
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [installing, setInstalling] = useState(false);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const loadVersions = async () => {
    if (versions.length > 0) {
      setShowVersions(!showVersions);
      return;
    }

    try {
      setLoadingVersions(true);
      const data = await modApi.getModVersions(source, mod.id, serverVersion, modLoader);
      setVersions(data.versions || []);
      setShowVersions(true);
    } catch (err) {
      alert(`Failed to load versions: ${err.message}`);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleInstall = async (version) => {
    if (serverStatus === 'running') {
      alert('Stop the server before installing mods');
      return;
    }

    try {
      setInstalling(true);
      await onInstall(mod, version);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallLatest = async () => {
    // Load versions if not already loaded
    if (versions.length === 0) {
      try {
        setLoadingVersions(true);
        const data = await modApi.getModVersions(source, mod.id, serverVersion, modLoader);
        const loadedVersions = data.versions || [];
        setVersions(loadedVersions);

        if (loadedVersions.length > 0) {
          await handleInstall(loadedVersions[0]);
        } else {
          alert('No compatible versions found');
        }
      } finally {
        setLoadingVersions(false);
      }
    } else if (versions.length > 0) {
      await handleInstall(versions[0]);
    }
  };

  const isRunning = serverStatus === 'running';

  return (
    <div className="mod-result-card">
      <div className="mod-result-main">
        {mod.iconUrl && (
          <img
            src={mod.iconUrl}
            alt=""
            className="mod-icon"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}

        <div className="mod-info">
          <h4 className="mod-name">
            <a href={mod.sourceUrl} target="_blank" rel="noopener noreferrer">
              {mod.name}
            </a>
          </h4>
          <p className="mod-author">by {mod.author}</p>
          <p className="mod-description">{mod.description}</p>
          <div className="mod-meta">
            <span className="downloads" title="Downloads">
              &#8595; {formatNumber(mod.downloads)}
            </span>
            {mod.updatedAt && (
              <span className="updated" title="Last Updated">
                Updated {formatDate(mod.updatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="mod-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadVersions}
            disabled={loadingVersions}
          >
            {loadingVersions ? '...' : showVersions ? 'Hide Versions' : 'Versions'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleInstallLatest}
            disabled={isRunning || installing || loadingVersions}
            title={isRunning ? 'Stop server to install' : 'Install latest version'}
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>

      {showVersions && versions.length > 0 && (
        <div className="versions-list">
          <table className="versions-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Game Versions</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.slice(0, 10).map((version) => (
                <tr key={version.id}>
                  <td className="version-name">
                    {version.versionNumber || version.name}
                  </td>
                  <td className="version-game">
                    {version.gameVersions?.slice(0, 3).join(', ')}
                    {version.gameVersions?.length > 3 && '...'}
                  </td>
                  <td className="version-type">
                    <span className={`release-type ${version.releaseType}`}>
                      {version.releaseType}
                    </span>
                  </td>
                  <td className="version-action">
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => handleInstall(version)}
                      disabled={isRunning || installing}
                    >
                      Install
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {versions.length > 10 && (
            <p className="more-versions">
              Showing 10 of {versions.length} versions.{' '}
              <a href={mod.sourceUrl} target="_blank" rel="noopener noreferrer">
                View all on {source === 'modrinth' ? 'Modrinth' : 'CurseForge'}
              </a>
            </p>
          )}
        </div>
      )}

      {showVersions && versions.length === 0 && !loadingVersions && (
        <div className="no-versions">
          No compatible versions found for Minecraft {serverVersion}
        </div>
      )}
    </div>
  );
}

export default ModSearchResult;
