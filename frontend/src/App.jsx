import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ServerDetails from './pages/ServerDetails';
import ModpackLibraryPage from './pages/ModpackLibraryPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  const { isAuthenticated, authEnabled, loading, logout, user } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        {/* Login route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          }
        />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div>
                <header className="app-header">
                  <div className="app-header-left">
                    <h1>⛏️ Minecraft Server Manager</h1>
                    <nav className="app-nav">
                      <Link to="/">Dashboard</Link>
                      <Link to="/modpacks">Modpack Library</Link>
                    </nav>
                  </div>
                  {authEnabled && user && (
                    <div className="header-user">
                      <span className="user-name">👤 {user.username}</span>
                      <button onClick={logout} className="btn-logout">
                        Logout
                      </button>
                    </div>
                  )}
                </header>

                <main className="app-main">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/servers/:id" element={<ServerDetails />} />
                    <Route path="/modpacks" element={<ModpackLibraryPage />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
