import ServerSettingsForm from '../../components/ServerSettingsForm';
import ServerIconUploader from '../../components/ServerIconUploader';
import FileExplorer from '../../components/FileExplorer';
import './SettingsTab.css';

function SettingsTab({ server, onUpdated }) {
  return (
    <div className="settings-tab">
      <div className="settings-grid">
        <ServerSettingsForm
          serverId={server.id}
          initialSettings={server.settings}
          onUpdated={onUpdated}
        />
        <div className="settings-sidebar">
          <ServerIconUploader serverId={server.id} />
        </div>
      </div>

      <div className="file-explorer-section">
        <h3>Server Files</h3>
        <FileExplorer serverId={server.id} />
      </div>
    </div>
  );
}

export default SettingsTab;
