import { Navigate } from "react-router-dom";

import { ROLE_HOME, getRoleHome, normalizeRole } from "../utils/roleHome";

const RoleHomeRedirect = () => {
  const token = localStorage.getItem("token");
  const role = normalizeRole(localStorage.getItem("role"));

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!ROLE_HOME[role]) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("isAuthenticated");
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHome(role)} replace />;
};

export default RoleHomeRedirect;
