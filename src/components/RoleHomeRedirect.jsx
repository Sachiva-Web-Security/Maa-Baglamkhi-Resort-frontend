import { Navigate } from "react-router-dom";

import { getRoleHome } from "../utils/roleHome";

const RoleHomeRedirect = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHome(role)} replace />;
};

export default RoleHomeRedirect;
