import { useEffect, useState, useCallback } from 'react';
import ModpackLibrary from '../components/ModpackLibrary';
import { serverApi } from '../services/api';
import { formatServerType } from '../utils/serverTypes';
import './ModpackLibraryPage.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

function ModpackLibraryPage() {
  const [modpacks, setModpacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableMessage, setTableMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAllModpacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTableMessage(null);
      const data = await serverApi.listAllModpacks();
      setModpacks(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllModpacks();
  }, [fetchAllModpacks]);

  const handleDeletePack = useCallback(
    async (pack) => {
      if (!pack) return;
      const confirmed = window.confirm(`Remove "${pack.filename}" from the ${pack.serverType} library?`);
      if (!confirmed) {
        return;
      }

      const packKey = `${pack.serverType}:${pack.filename}`;

      try {
        setDeleting(packKey);
        setTableMessage(null);
        await serverApi.deleteSavedModpack(pack.serverType, pack.filename);
        await fetchAllModpacks();
        setTableMessage({
          type: 'success',
          message: `Removed "${pack.filename}" from the ${formatServerType(pack.serverType)} library`
        });
      } catch (err) {
        setTableMessage({
          type: 'error',
          message: err.message
        });
      } finally {
        setDeleting(null);
      }
    },
    [fetchAllModpacks]
  );

  return (
    <div className="modpack-page">
      <div className="modpack-page-header">
        <div>
          <h2>Modpack Library</h2>
          <p>Inspect every saved modpack, see its loader and Minecraft version(s), then manage uploads/imports per server type.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchAllModpacks}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      <div className="modpack-table-card">
        <div className="modpack-table-header">
          <h3>Saved Modpacks</h3>
          <span>{modpacks.length} total</span>
        </div>

        {error && <div className="modpack-table-error">Failed to load modpacks: {error}</div>}
        {tableMessage && (
          <div className={`modpack-table-status status-${tableMessage.type}`}>
            {tableMessage.message}
          </div>
        )}

        {loading ? (
          <div className="modpack-table-empty">Loading modpacks...</div>
        ) : modpacks.length === 0 ? (
          <div className="modpack-table-empty">No modpacks have been saved yet.</div>
        ) : (
          <div className="modpack-table-wrapper">
            <table className="modpack-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Loader</th>
                  <th>Modpack Version</th>
                  <th>Minecraft Versions</th>
                  <th>Filename</th>
                  <th>Imported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modpacks.map((pack) => (
                  <tr key={`${pack.serverType}-${pack.filename}`}>
                    <td>
                      <div className="modpack-name-cell">
                        <span className="name">{pack.name}</span>
                        {pack.description && <small>{pack.description}</small>}
                      </div>
                    </td>
                    <td>
                      <span className="loader-badge">{formatServerType(pack.serverType)}</span>
                    </td>
                    <td>{pack.version || '—'}</td>
                    <td>
                      {pack.gameVersions?.length
                        ? pack.gameVersions.join(', ')
                        : 'Unknown'}
                    </td>
                    <td>
                      <code>{pack.filename}</code>
                    </td>
                    <td>{formatDateTime(pack.importedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm modpack-table-delete"
                        onClick={() => handleDeletePack(pack)}
                        disabled={deleting === `${pack.serverType}:${pack.filename}`}
                      >
                        {deleting === `${pack.serverType}:${pack.filename}` ? 'Removing...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModpackLibrary initialType="PAPER" showManagement />
    </div>
  );
}

export default ModpackLibraryPage;
