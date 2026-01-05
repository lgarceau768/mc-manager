import { useState } from 'react';
import './PlayerCard.css';

function PlayerCard({ playerName, serverId, onAction, showActions = true }) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use Minotar API which accepts usernames (not UUIDs like Crafatar)
  const headUrl = `https://minotar.net/helm/${encodeURIComponent(playerName)}/64`;

  // Generate fallback avatar with player initials
  const getInitials = (name) => {
    return name.substring(0, 2).toUpperCase();
  };

  const handleAction = (action) => {
    setShowMenu(false);
    if (onAction) {
      onAction(action, playerName);
    }
  };

  return (
    <div className="player-card">
      <div className="player-info">
        {!imageError ? (
          <img
            src={headUrl}
            alt={playerName}
            className="player-head"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="player-head-fallback">
            {getInitials(playerName)}
          </div>
        )}
        <span className="player-name">{playerName}</span>
      </div>

      {showActions && (
        <div className="player-actions">
          <button
            className="player-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            title="Player actions"
          >
            &#8942;
          </button>

          {showMenu && (
            <div className="player-menu">
              <button onClick={() => handleAction('kick')}>
                Kick Player
              </button>
              <button onClick={() => handleAction('ban')}>
                Ban Player
              </button>
              <button onClick={() => handleAction('op')}>
                Make OP
              </button>
              <button onClick={() => handleAction('deop')}>
                Remove OP
              </button>
              <button onClick={() => handleAction('tp')}>
                Teleport To
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerCard;
