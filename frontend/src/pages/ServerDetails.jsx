import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ServerStatus from '../components/ServerStatus';
import ServerConsole from '../components/ServerConsole';
import ModUploader from '../components/ModUploader';
import ServerSettingsForm from '../components/ServerSettingsForm';
import ServerIconUploader from '../components/ServerIconUploader';
import FileExplorer from '../components/FileExplorer';
import ModpackLibrary from '../components/ModpackLibrary';
import { serverApi } from '../services/api';
import { formatServerType, getServerAddress } from '../utils/serverTypes';
import './ServerDetails.css';

function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await serverApi.getServer(id);
        setServer(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServer();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchServer, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action) => {
    try {
      let updatedServer;

      switch (action) {
        case 'start':
          updatedServer = await serverApi.startServer(id);
          break;
        case 'stop':
          updatedServer = await serverApi.stopServer(id);
          break;
        case 'restart':
          updatedServer = await serverApi.restartServer(id);
          break;
      }

      setServer(updatedServer);
    } catch (err) {
      alert(`Failed to ${action} server: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete server "${server.name}"?`)) {
      return;
    }

    try {
      await serverApi.deleteServer(id);
      navigate('/');
    } catch (err) {
      alert(`Failed to delete server: ${err.message}`);
    }
  };

  if (loading && !server) {
    return <div className="loading-page">Loading server...</div>;
  }

  if (error) {
    return (
      <div className="error-page">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  if (!server) {
    return null;
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'starting':
      case 'stopping':
        return 'status-transitioning';
      default:
        return '';
    }
  };

  return (
    <div className="server-details">
      <div className="details-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>

        <div className="header-content">
          <div className="header-left">
            <h2>{server.name}</h2>
            <span className={`status-badge ${getStatusClass(server.status)}`}>
              {server.status}
            </span>
          </div>

          <div className="header-actions">
            {server.status === 'stopped' && (
              <button
                className="btn btn-success"
                onClick={() => handleAction('start')}
              >
                Start Server
              </button>
            )}

            {server.status === 'running' && (
              <>
                <button
                  className="btn btn-warning"
                  onClick={() => handleAction('stop')}
                >
                  Stop Server
                </button>
                <button
                  className="btn btn-info"
                  onClick={() => handleAction('restart')}
                >
                  Restart Server
                </button>
              </>
            )}

            <button
              className="btn btn-danger"
              onClick={handleDelete}
            >
              Delete Server
            </button>
          </div>
        </div>
      </div>

      <div className="server-info-grid">
        <div className="info-card">
          <h3>Server Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Server ID:</span>
              <span className="info-value">{server.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type:</span>
              <span className="info-value">{formatServerType(server.type)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">{server.version}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Port:</span>
              <span className="info-value">{server.port}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Memory:</span>
              <span className="info-value">{server.memory}</span>
            </div>
            {server.connectionInfo && (
              <div className="info-item">
                <span className="info-label">Server Address:</span>
                <span className="info-value">{getServerAddress(server)}</span>
              </div>
            )}
            {server.cpu_limit && (
              <div className="info-item">
                <span className="info-label">CPU Limit:</span>
                <span className="info-value">{server.cpu_limit} cores</span>
              </div>
            )}
          </div>
        </div>

        <ServerStatus serverId={id} />
      </div>

      <div className="server-settings-grid">
        <ServerSettingsForm
          serverId={id}
          initialSettings={server.settings}
          onUpdated={(updated) =>
            setServer((prev) => ({
              ...prev,
              ...updated,
              stats: updated?.stats ?? prev?.stats
            }))
          }
        />
        <div className="server-config-side">
          <ServerIconUploader serverId={id} />
          <ModUploader serverId={id} serverType={server.type} />
        </div>
      </div>

      <div className="file-explorer-section">
        <FileExplorer serverId={id} />
      </div>

      <div className="modpack-library-section">
        <ModpackLibrary initialType={server.type} />
      </div>

      <div className="console-section">
        <ServerConsole serverId={id} />
      </div>
    </div>
  );
}

export default ServerDetails;
