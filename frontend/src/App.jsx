import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ServerDetails from './pages/ServerDetails';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>⛏️ Minecraft Server Manager</h1>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers/:id" element={<ServerDetails />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
