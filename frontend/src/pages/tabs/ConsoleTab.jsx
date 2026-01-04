import ServerConsole from '../../components/ServerConsole';

function ConsoleTab({ serverId }) {
  return (
    <div className="console-tab">
      <ServerConsole serverId={serverId} />
    </div>
  );
}

export default ConsoleTab;
