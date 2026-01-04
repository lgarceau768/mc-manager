import { useState } from 'react';
import { Link } from 'react-router-dom';
import InstalledModsList from '../../components/InstalledModsList';
import ModSearch from '../../components/ModSearch';
import ModpackLibrary from '../../components/ModpackLibrary';
import './ModsTab.css';

function ModsTab({ server }) {
  const [view, setView] = useState('installed');

  return (
    <div className="mods-tab">
      <div className="mods-view-toggle">
        <button
          className={`toggle-btn ${view === 'installed' ? 'active' : ''}`}
          onClick={() => setView('installed')}
        >
          Installed
        </button>
        <button
          className={`toggle-btn ${view === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          Search
        </button>
        <button
          className={`toggle-btn ${view === 'library' ? 'active' : ''}`}
          onClick={() => setView('library')}
        >
          Library
        </button>
      </div>

      <div className="mods-content">
        {view === 'installed' && (
          <InstalledModsList
            serverId={server.id}
            serverType={server.type}
            serverStatus={server.status}
          />
        )}

        {view === 'search' && (
          <ModSearch
            serverId={server.id}
            serverType={server.type}
            serverVersion={server.version}
            serverStatus={server.status}
          />
        )}

        {view === 'library' && (
          <div className="library-wrapper">
            <div className="library-header">
              <p className="library-info">
                Apply saved modpacks to this server or download them for backup.
              </p>
              <Link to="/modpacks" className="btn btn-secondary btn-sm">
                Manage Library
              </Link>
            </div>
            <ModpackLibrary
              initialType={server.type}
              serverId={server.id}
              serverStatus={server.status}
              showManagement={false}
              showDownload={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ModsTab;
