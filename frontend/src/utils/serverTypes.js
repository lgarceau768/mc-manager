export const SERVER_TYPE_OPTIONS = [
  { value: 'PAPER', label: 'Paper (plugins)' },
  { value: 'FABRIC', label: 'Fabric (mods)' },
  { value: 'FORGE', label: 'Forge (mods)' },
  { value: 'NEOFORGE', label: 'NeoForge (mods)' }
];

export const formatServerType = (type) => {
  switch ((type || '').toUpperCase()) {
    case 'PAPER':
      return 'Paper';
    case 'FABRIC':
      return 'Fabric';
    case 'FORGE':
      return 'Forge';
    case 'NEOFORGE':
      return 'NeoForge';
    default:
      return type || 'Unknown';
  }
};

export const getServerAddress = (server) => {
  if (!server) return '';
  const browserHost =
    typeof window !== 'undefined' && window.location && window.location.hostname
      ? window.location.hostname
      : null;
  const host = browserHost || server.connectionInfo?.host || 'localhost';
  const port = server.connectionInfo?.port || server.port;
  return `${host}:${port}`;
};
