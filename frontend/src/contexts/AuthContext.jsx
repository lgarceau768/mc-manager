import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();

    // Listen for unauthorized events
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Try to restore token from localStorage
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        setAuthToken(savedToken);
      }

      // Check auth status
      const status = await authApi.getStatus();
      setAuthEnabled(status.enabled);

      if (status.enabled && status.authenticated) {
        setUser(status.user);
        setIsAuthenticated(true);
      } else if (!status.enabled) {
        // Auth is disabled, user is always authenticated
        setIsAuthenticated(true);
        setUser({ username: 'guest' });
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      // If auth check fails, clear token
      localStorage.removeItem('authToken');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authApi.login(username, password);

      // Save token
      localStorage.setItem('authToken', response.token);
      setAuthToken(response.token);

      // Set user
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      localStorage.removeItem('authToken');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    authEnabled,
    loading,
    isAuthenticated,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
