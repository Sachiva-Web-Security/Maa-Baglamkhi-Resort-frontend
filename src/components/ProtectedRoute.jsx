import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 * - Redirects to /login if no token found
 * - Redirects to /dashboard if user's role is not in allowedRoles
 * - NOTE: always normalizes role to lowercase before comparing
 *   so DB values like 'Admin', 'ADMIN', 'admin' all match
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");

  // Not logged in → send to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Role check — normalize to lowercase for safe comparison
  if (allowedRoles && allowedRoles.length > 0) {
    const role = (localStorage.getItem("role") || "").toLowerCase().trim();

    if (!allowedRoles.includes(role)) {
      // Logged in but wrong role → send to dashboard (shows their allowed view)
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;