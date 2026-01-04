import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TabNavigation from '../components/TabNavigation';
import OverviewTab from './tabs/OverviewTab';
import ConsoleTab from './tabs/ConsoleTab';
import ModsTab from './tabs/ModsTab';
import PlayersTab from './tabs/PlayersTab';
import SettingsTab from './tabs/SettingsTab';
import BackupsTab from './tabs/BackupsTab';
import { serverApi, playerApi } from '../services/api';
import './ServerDetails.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '\u2139\uFE0F' },
  { id: 'console', label: 'Console', icon: '\uD83D\uDCBB' },
  { id: 'mods', label: 'Mods', icon: '\uD83D\uDCE6' },
  { id: 'players', label: 'Players', icon: '\uD83D\uDC65' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
  { id: 'backups', label: 'Backups', icon: '\uD83D\uDCBE' }
];

function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [playerCount, setPlayerCount] = useState(null);

  // Fetch server data
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

  // Fetch player count when server is running
  useEffect(() => {
    const fetchPlayers = async () => {
      if (server?.status === 'running') {
        try {
          const data = await playerApi.getOnlinePlayers(id);
          setPlayerCount(data.online);
        } catch {
          setPlayerCount(null);
        }
      } else {
        setPlayerCount(null);
      }
    };

    fetchPlayers();

    // Poll for player count every 15 seconds
    if (server?.status === 'running') {
      const interval = setInterval(fetchPlayers, 15000);
      return () => clearInterval(interval);
    }
  }, [id, server?.status]);

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

  const handleServerUpdated = (updated) => {
    setServer((prev) => ({
      ...prev,
      ...updated,
      stats: updated?.stats ?? prev?.stats
    }));
  };

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

  // Build badges object for tabs
  const badges = {};
  if (playerCount !== null && playerCount > 0) {
    badges.players = playerCount;
  }

  return (
    <div className="server-details">
      <div className="details-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          &#8592; Back
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

      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={badges}
      />

      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab server={server} onAction={handleAction} />
        )}

        {activeTab === 'console' && (
          <ConsoleTab serverId={server.id} />
        )}

        {activeTab === 'mods' && (
          <ModsTab server={server} />
        )}

        {activeTab === 'players' && (
          <PlayersTab serverId={server.id} serverStatus={server.status} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab server={server} onUpdated={handleServerUpdated} />
        )}

        {activeTab === 'backups' && (
          <BackupsTab serverId={server.id} serverStatus={server.status} />
        )}
      </div>
    </div>
  );
}

export default ServerDetails;
