import './PlayerCard.css';

function PlayerCard({ playerName, onClick }) {
  // Use Crafatar API for player head images
  const headUrl = `https://crafatar.com/avatars/${playerName}?size=64&overlay`;

  return (
    <div className="player-card" onClick={onClick} role="button" tabIndex={0}>
      <img
        src={headUrl}
        alt={playerName}
        className="player-head"
        onError={(e) => {
          // Fallback to default Steve head if avatar fails
          e.target.src = 'https://crafatar.com/avatars/MHF_Steve?size=64&overlay';
        }}
      />
      <span className="player-name">{playerName}</span>
    </div>
  );
}

export default PlayerCard;
