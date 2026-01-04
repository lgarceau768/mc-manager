import { useState, useEffect } from 'react';
import PlayerCard from '../../components/PlayerCard';
import { playerApi } from '../../services/api';
import './PlayersTab.css';

function PlayersTab({ serverId, serverStatus }) {
  const [players, setPlayers] = useState({ online: 0, max: 0, players: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlayers = async () => {
    if (serverStatus !== 'running') {
      setPlayers({ online: 0, max: 0, players: [] });
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await playerApi.getOnlinePlayers(serverId);
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();

    // Poll every 10 seconds while server is running
    if (serverStatus === 'running') {
      const interval = setInterval(loadPlayers, 10000);
      return () => clearInterval(interval);
    }
  }, [serverId, serverStatus]);

  if (serverStatus !== 'running') {
    return (
      <div className="players-tab offline">
        <div className="offline-message">
          <span className="offline-icon">&#128683;</span>
          <h3>Server Offline</h3>
          <p>Start the server to view online players.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="players-tab">
      <div className="players-header">
        <h3>
          Online Players
          <span className="player-count">
            {players.online}/{players.max}
          </span>
        </h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadPlayers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="players-error">
          <p>Could not retrieve player list: {error}</p>
        </div>
      )}

      {!loading && !error && players.online === 0 && (
        <div className="no-players">
          <span className="no-players-icon">&#128100;</span>
          <p>No players online</p>
        </div>
      )}

      {players.players.length > 0 && (
        <div className="players-grid">
          {players.players.map((playerName) => (
            <PlayerCard
              key={playerName}
              playerName={playerName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayersTab;
