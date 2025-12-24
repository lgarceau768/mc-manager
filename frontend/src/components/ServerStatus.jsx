import { useState, useEffect } from 'react';
import { serverApi } from '../services/api';
import './ServerStatus.css';

function ServerStatus({ serverId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const serverData = await serverApi.getServer(serverId);
        setStats(serverData.stats || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 5 seconds
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, [serverId]);

  if (loading && !stats) {
    return <div className="server-status loading">Loading stats...</div>;
  }

  if (error) {
    return <div className="server-status error">Failed to load stats: {error}</div>;
  }

  if (!stats) {
    return (
      <div className="server-status empty">
        Server stats not available. Start the server to view metrics.
      </div>
    );
  }

  return (
    <div className="server-status">
      <h3>Server Statistics</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">CPU Usage</div>
          <div className="stat-value">{stats.cpuUsage}%</div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill cpu"
              style={{ width: `${Math.min(parseFloat(stats.cpuUsage), 100)}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Memory Usage</div>
          <div className="stat-value">
            {stats.memoryUsage} / {stats.memoryLimit}
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill memory"
              style={{ width: `${Math.min(parseFloat(stats.memoryPercent), 100)}%` }}
            />
          </div>
          <div className="stat-detail">{stats.memoryPercent}%</div>
        </div>
      </div>
    </div>
  );
}

export default ServerStatus;
