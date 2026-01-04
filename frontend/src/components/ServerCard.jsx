import { useNavigate } from 'react-router-dom';
import { serverApi } from '../services/api';
import { formatServerType, getServerAddress } from '../utils/serverTypes';
import './ServerCard.css';

function ServerCard({ server, onUpdate, onDelete }) {
  const navigate = useNavigate();

  const getStatusClass = (status) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'starting':
      case 'stopping':
        return 'status-transitioning';
      case 'error':
      case 'unhealthy':
        return 'status-error';
      default:
        return '';
    }
  };

  const handleAction = async (action) => {
    try {
      let updatedServer;

      switch (action) {
        case 'start':
          updatedServer = await serverApi.startServer(server.id);
          break;
        case 'stop':
          updatedServer = await serverApi.stopServer(server.id);
          break;
        case 'restart':
          updatedServer = await serverApi.restartServer(server.id);
          break;
      }

      if (onUpdate) {
        onUpdate(updatedServer);
      }
    } catch (error) {
      alert(`Failed to ${action} server: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete server "${server.name}"?`)) {
      return;
    }

    try {
      await serverApi.deleteServer(server.id);
      if (onDelete) {
        onDelete(server.id);
      }
    } catch (error) {
      alert(`Failed to delete server: ${error.message}`);
    }
  };

  return (
    <div className="server-card" onClick={() => navigate(`/servers/${server.id}`)}>
      <div className="server-card-header">
        <h3>{server.name}</h3>
        <span className={`status-badge ${getStatusClass(server.status)}`}>
          {server.status}
        </span>
      </div>

      <div className="server-card-info">
        <div className="info-row">
          <span className="label">Type:</span>
          <span className="value">{formatServerType(server.type)}</span>
        </div>
        <div className="info-row">
          <span className="label">Version:</span>
          <span className="value">{server.version}</span>
        </div>
        <div className="info-row">
          <span className="label">Port:</span>
          <span className="value">{server.port}</span>
        </div>
        {server.connectionInfo?.address && (
          <div className="info-row">
            <span className="label">Address:</span>
            <span className="value">{getServerAddress(server)}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">Memory:</span>
          <span className="value">{server.memory}</span>
        </div>
      </div>

      {server.containerStatus?.error && (
        <div className="server-card-error" onClick={(e) => e.stopPropagation()}>
          <span className="error-icon">⚠</span>
          <span className="error-message">{server.containerStatus.error}</span>
          {server.containerStatus?.exitCode !== null && (
            <span className="error-code">Exit code: {server.containerStatus.exitCode}</span>
          )}
        </div>
      )}

      <div className="server-card-actions" onClick={(e) => e.stopPropagation()}>
        {(server.status === 'stopped' || server.status === 'error') && (
          <button
            className="btn btn-success"
            onClick={() => handleAction('start')}
          >
            {server.status === 'error' ? 'Retry' : 'Start'}
          </button>
        )}

        {server.status === 'running' && (
          <>
            <button
              className="btn btn-warning"
              onClick={() => handleAction('stop')}
            >
              Stop
            </button>
            <button
              className="btn btn-info"
              onClick={() => handleAction('restart')}
            >
              Restart
            </button>
          </>
        )}

        <button
          className="btn btn-danger"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default ServerCard;
