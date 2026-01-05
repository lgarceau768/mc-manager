import { useState } from 'react';
import { modApi } from '../services/api';
import './ModIcon.css';

function ModIcon({ serverId, filename, modName, size = 32 }) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const iconUrl = modApi.getModIconUrl(serverId, filename);

  // Generate a consistent color based on mod name for fallback
  const getColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 45%)`;
  };

  const getInitials = (name) => {
    const cleanName = name
      .replace('.jar', '')
      .replace('.disabled', '')
      .replace(/[-_]/g, ' ');
    const words = cleanName.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  };

  if (hasError) {
    return (
      <div
        className="mod-icon mod-icon-fallback"
        style={{
          width: size,
          height: size,
          backgroundColor: getColorFromName(modName)
        }}
        title={modName}
      >
        {getInitials(modName)}
      </div>
    );
  }

  return (
    <div className="mod-icon-wrapper" style={{ width: size, height: size }}>
      {!loaded && (
        <div
          className="mod-icon mod-icon-loading"
          style={{ width: size, height: size }}
        />
      )}
      <img
        src={iconUrl}
        alt={modName}
        className={`mod-icon ${loaded ? 'loaded' : 'loading'}`}
        style={{ width: size, height: size }}
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default ModIcon;
