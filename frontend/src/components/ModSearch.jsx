import { useState, useEffect } from 'react';
import ModSearchResult from './ModSearchResult';
import { modApi } from '../services/api';
import './ModSearch.css';

function ModSearch({ serverId, serverType, serverVersion, serverStatus }) {
  const [source, setSource] = useState('modrinth');
  const [sources, setSources] = useState(['modrinth']);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Get modloader from server type
  const modLoader = serverType === 'FABRIC' ? 'fabric'
    : serverType === 'FORGE' ? 'forge'
    : serverType === 'NEOFORGE' ? 'neoforge'
    : null;

  // Check available sources on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await modApi.getConfig();
        setSources(config.sources || ['modrinth']);
      } catch (err) {
        // Default to modrinth only
        setSources(['modrinth']);
      }
    };
    checkConfig();
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();

    if (!query.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearched(true);

      const data = await modApi.searchMods(source, query, serverVersion, modLoader);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (mod, version) => {
    try {
      await modApi.installModToServer(serverId, source, mod.id, version.id);
      alert(`Successfully installed ${mod.name}`);
    } catch (err) {
      alert(`Failed to install mod: ${err.message}`);
    }
  };

  // Paper doesn't use modloaders in the traditional sense
  if (serverType === 'PAPER') {
    return (
      <div className="mod-search paper-info">
        <div className="paper-message">
          <h4>Plugin Search</h4>
          <p>
            Paper servers use plugins instead of mods. To find plugins, visit:
          </p>
          <ul>
            <li>
              <a href="https://hangar.papermc.io/" target="_blank" rel="noopener noreferrer">
                Hangar (PaperMC)
              </a>
            </li>
            <li>
              <a href="https://www.spigotmc.org/resources/" target="_blank" rel="noopener noreferrer">
                SpigotMC Resources
              </a>
            </li>
            <li>
              <a href="https://dev.bukkit.org/bukkit-plugins" target="_blank" rel="noopener noreferrer">
                Bukkit Plugins
              </a>
            </li>
          </ul>
          <p>
            Download plugin .jar files and upload them using the Installed tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-search">
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-controls">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="source-select"
          >
            {sources.includes('modrinth') && (
              <option value="modrinth">Modrinth</option>
            )}
            {sources.includes('curseforge') && (
              <option value="curseforge">CurseForge</option>
            )}
          </select>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for mods..."
            className="search-input"
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="search-info">
        Searching for <strong>{modLoader || 'all'}</strong> mods compatible with
        Minecraft <strong>{serverVersion}</strong>
      </div>

      {error && (
        <div className="search-error">
          <p>Search failed: {error}</p>
        </div>
      )}

      {searched && !loading && !error && results.length === 0 && (
        <div className="no-results">
          <p>No mods found matching "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((mod) => (
            <ModSearchResult
              key={mod.id}
              mod={mod}
              source={source}
              serverVersion={serverVersion}
              modLoader={modLoader}
              onInstall={handleInstall}
              serverStatus={serverStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ModSearch;
