import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, authEnabled } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // If auth is enabled and user is not authenticated, redirect to login
  if (authEnabled && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated or auth is disabled
  return children;
}

export default ProtectedRoute;
