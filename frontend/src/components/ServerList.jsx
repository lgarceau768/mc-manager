import { useState, useEffect } from 'react';
import ServerCard from './ServerCard';
import CreateServerForm from './CreateServerForm';
import { serverApi } from '../services/api';
import './ServerList.css';

function ServerList() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serverApi.getServers();
      setServers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerUpdate = (updatedServer) => {
    setServers((prev) =>
      prev.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
  };

  const handleServerDelete = (deletedId) => {
    setServers((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleServerCreate = (newServer) => {
    setServers((prev) => [newServer, ...prev]);
    setShowCreateForm(false);
  };

  const filteredServers = servers.filter((server) => {
    if (filter === 'all') return true;
    return server.status === filter;
  });

  const stats = {
    total: servers.length,
    running: servers.filter((s) => s.status === 'running').length,
    stopped: servers.filter((s) => s.status === 'stopped').length
  };

  if (loading && servers.length === 0) {
    return <div className="loading">Loading servers...</div>;
  }

  return (
    <div className="server-list-container">
      <div className="server-list-header">
        <div className="stats">
          <div className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.running}</span>
            <span className="stat-label">Running</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.stopped}</span>
            <span className="stat-label">Stopped</span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Create Server
        </button>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
          onClick={() => setFilter('running')}
        >
          Running
        </button>
        <button
          className={`filter-btn ${filter === 'stopped' ? 'active' : ''}`}
          onClick={() => setFilter('stopped')}
        >
          Stopped
        </button>

        <button className="refresh-btn" onClick={fetchServers}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {filteredServers.length === 0 ? (
        <div className="empty-state">
          <p>No servers found. Create your first server to get started!</p>
        </div>
      ) : (
        <div className="server-grid">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onUpdate={handleServerUpdate}
              onDelete={handleServerDelete}
            />
          ))}
        </div>
      )}

      {showCreateForm && (
        <CreateServerForm
          onClose={() => setShowCreateForm(false)}
          onCreate={handleServerCreate}
        />
      )}
    </div>
  );
}

export default ServerList;
