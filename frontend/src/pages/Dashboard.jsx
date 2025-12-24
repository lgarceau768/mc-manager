import ServerList from '../components/ServerList';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Server Dashboard</h2>
        <p>Manage your Minecraft servers</p>
      </div>

      <ServerList />
    </div>
  );
}

export default Dashboard;
