import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// A route is "ready" once AuthContext has had a chance to verify the token
// against the backend. Until then we render a tiny loading state so we
// don't bounce a real session to /login during the first render.
function Splash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      Loading...
    </div>
  );
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, ready } = useAuth();

  if (!ready) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;