import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ServerDetails from './pages/ServerDetails';
import ModpackLibraryPage from './pages/ModpackLibraryPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const THEME_STORAGE_KEY = 'mcsm-theme';

const getPreferredTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

function App() {
  const { isAuthenticated, authEnabled, loading, logout, user } = useAuth();
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${theme}-theme`);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDarkTheme = theme === 'dark';
  const themeLabel = isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode';
  const themeIcon = isDarkTheme ? '☀️' : '🌙';

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
                    <div>
                      <p className="app-eyebrow">Control Center</p>
                      <h1>⛏️ Minecraft Server Manager</h1>
                    </div>
                    <nav className="app-nav">
                      <Link to="/">Dashboard</Link>
                      <Link to="/modpacks">Modpack Library</Link>
                    </nav>
                  </div>
                  <div className="app-header-actions">
                    <button
                      type="button"
                      className="theme-toggle"
                      onClick={toggleTheme}
                      aria-label={themeLabel}
                      title={themeLabel}
                    >
                      <span aria-hidden="true">{themeIcon}</span>
                      <span>{isDarkTheme ? 'Light' : 'Dark'} mode</span>
                    </button>
                    {authEnabled && user && (
                      <div className="header-user">
                        <span className="user-name">👤 {user.username}</span>
                        <button onClick={logout} className="btn-logout">
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
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
