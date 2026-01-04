import ServerStatus from '../../components/ServerStatus';
import { formatServerType, getServerAddress } from '../../utils/serverTypes';
import './OverviewTab.css';

function OverviewTab({ server, onAction }) {
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

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          {server.status === 'stopped' && (
            <button
              className="btn btn-success"
              onClick={() => onAction('start')}
            >
              Start Server
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
