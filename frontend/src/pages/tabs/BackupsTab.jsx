import ServerBackups from '../../components/ServerBackups';

function BackupsTab({ serverId, serverStatus }) {
  return (
    <div className="backups-tab">
      <ServerBackups serverId={serverId} serverStatus={serverStatus} />
    </div>
  );
}

export default BackupsTab;
