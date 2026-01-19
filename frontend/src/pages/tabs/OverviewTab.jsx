import { useState } from 'react';
import ServerStatus from '../../components/ServerStatus';
import { serverApi } from '../../services/api';
import { formatServerType, getServerAddress } from '../../utils/serverTypes';
import './OverviewTab.css';

function OverviewTab({ server, onAction, onServerUpdated }) {
  const [recreating, setRecreating] = useState(false);
  const [recreateError, setRecreateError] = useState(null);
  const [recreateSuccess, setRecreateSuccess] = useState(false);

  const handleRecreateContainer = async () => {
    if (!window.confirm('This will create a new Docker container for this server. Your world data and settings will be preserved. Continue?')) {
      return;
    }

    try {
      setRecreating(true);
      setRecreateError(null);
      setRecreateSuccess(false);

      const updatedServer = await serverApi.recreateContainer(server.id);

      setRecreateSuccess(true);
      setTimeout(() => setRecreateSuccess(false), 5000);

      if (onServerUpdated) {
        onServerUpdated(updatedServer);
      }
    } catch (err) {
      setRecreateError(err.message);
    } finally {
      setRecreating(false);
    }
  };

  // Check if container is missing
  const containerMissing = server.containerStatus &&
    !server.containerStatus.running &&
    server.containerStatus.status === 'stopped' &&
    server.containerStatus.error === null &&
    server.status !== 'stopped';

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

  return (
    <div className="overview-tab">
      <div className="overview-grid">
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
                <span className="info-value address">{getServerAddress(server)}</span>
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

        <ServerStatus serverId={server.id} />
      </div>

      {recreateSuccess && (
        <div className="recreate-success">
          Container recreated successfully! You can now start the server.
        </div>
      )}

      {recreateError && (
        <div className="recreate-error">
          Failed to recreate container: {recreateError}
        </div>
      )}

      {/* Container Missing Warning */}
      {!server.container_id && (
        <div className="container-missing-card">
          <h3>Container Not Found</h3>
          <div className="missing-details">
            <p>
              The Docker container for this server is missing or was removed outside of the application.
              Your world data and configuration files are still intact.
            </p>
            <p>
              Click the button below to recreate the container and restore server functionality.
            </p>
          </div>
          <div className="missing-actions">
            <button
              className="btn btn-primary"
              onClick={handleRecreateContainer}
              disabled={recreating}
            >
              {recreating ? 'Recreating...' : 'Recreate Container'}
            </button>
          </div>
        </div>
      )}

      {server.containerStatus?.error && (
        <div className="container-error-card">
          <h3>Container Error</h3>
          <div className="error-details">
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {server.containerStatus.error}
            </div>
            {server.containerStatus?.exitCode !== null && (
              <div className="error-info">
                <span className="label">Exit Code:</span>
                <span className="value">{server.containerStatus.exitCode}</span>
              </div>
            )}
            {server.containerStatus?.restartCount > 0 && (
              <div className="error-info">
                <span className="label">Restart Count:</span>
                <span className="value">{server.containerStatus.restartCount}</span>
              </div>
            )}
            {server.containerStatus?.finishedAt && (
              <div className="error-info">
                <span className="label">Failed At:</span>
                <span className="value">
                  {new Date(server.containerStatus.finishedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="error-hint">
            Check the Console tab for detailed logs. The server can be restarted using the button below.
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          {(server.status === 'stopped' || server.status === 'error') && (
            <button
              className="btn btn-success"
              onClick={() => onAction('start')}
            >
              {server.status === 'error' ? 'Retry Start' : 'Start Server'}
            </button>
          )}

          {server.status === 'running' && (
            <>
              <button
                className="btn btn-warning"
                onClick={() => onAction('stop')}
              >
                Stop Server
              </button>
              <button
                className="btn btn-info"
                onClick={() => onAction('restart')}
              >
                Restart Server
              </button>
            </>
          )}

          {(server.status === 'starting' || server.status === 'stopping') && (
            <button className="btn btn-secondary" disabled>
              {server.status === 'starting' ? 'Starting...' : 'Stopping...'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
